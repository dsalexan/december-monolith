import { get, isNil, set } from "lodash"

import { ANY_PROPERTY, PROPERTY, PropertyReference, PropertyReferencePattern, REFERENCE, PLACEHOLDER_SELF_REFERENCE, Reference } from "@december/utils/access"
import { OR } from "@december/utils/match/logical"
import { EQUALS, REGEX } from "@december/utils/match/element"
import { BasePattern } from "@december/utils/match/base"

import ObjectEventEmitter, { ListenerFunctionContext } from "./manager/events/emitter"
import { SET, OVERRIDE } from "./mutation"
import MutableObject from "./object"
import assert from "assert"
import { Mutation } from "./mutation/mutation"
import { MutationGenerator } from "./manager/mutator"
import makeProcessor, { Environment, ProcessedData, Processor } from "./tree"
import { Event_Listen } from "./manager/events"
import { Strategy } from "./strategy"
import { ReferenceIndexedEvent_Handle } from "./manager/events/events"
import { SIGNATURE, Signature } from "./manager/events/signature"

/**
 * WHAT IS A STRATEGY?
 *
 * - It is a list of event listeners, i.e. when a event is emitted, a listener is called
 * - This listeners, usually, enqueues a MUTATION GENERATOR for a specific object (i.e. a property is updated -> enqueue instructions to mutate object based on its value)
 *
 * - So a basic component of a strategy is:
 *
 *     (event, listener) <=> (event, mutation generator to be enqueued)
 *
 *  Sometimes we will need to PROXY events, i.e. call a listener for the event X when Y happens
 *  This demans some sort of "indexing" of listeners inside a strategy
 */

function isAnAlias(value: string) {
  return /^\w{2}\:[\w"\s]+$/.test(value)
}

export const DEFAULT_STRATEGY = new Strategy()
  .addFunction(`GCA:initialize`, (object, strategy) => ({ manager }) => {
    manager.mutator.enqueue(object.reference(`id`), {
      name: `GCA:initialize`,
      fn: () => {
        const { modes: _modes, level } = object.data._.GCA

        const instructions: Mutation[] = [SET(`__.aliases`, [`TR:${object.id === `1` ? `Uno` : `Dos`}`])]

        if (!isNil(level)) {
          const numericLevel = parseInt(level)
          assert(!isNaN(numericLevel), `Level "${level}" is not a number`)

          instructions.push(SET(`level`, numericLevel))
        }

        if (_modes) {
          const modes: unknown[] = []
          for (const [index, { id, name, value, bonus }] of _modes.entries()) {
            const mode = { id, name }

            if (value) {
              // 1. Make processor
              const processor = makeProcessor()

              // 2. Pre-process value (with empty environment)
              const preProcessedValue = processor.preProcess(value, new Environment(), {
                scope: { root: `math` },
                debug: false,
              })

              // 3. If value is ready, set it
              if (preProcessedValue.isReady) mode[`value`] = preProcessedValue.tree.expression()
              // 4. If value is not ready, listen for those references at MANAGER LEVEL
              //      i.e. "dynamic strategies" or somefin like that
              else {
                const path = `_.GCA.modes[${index}].value`

                // 4.1. Store pre-processed tree (just signature, tree itself is metadata)
                const processorSignature = new Signature(object.id, path, value)
                instructions.push(processorSignature.instruction())
                set(object.metadata, `processing['${path}'].processor`, processor)

                // 4.2 Store "baseline" missing references (i.e. those references needed, at least initially, to finish processing the value)
                //      [PRE-PROCESSING REFERENCES]
                //      NOTE: This "resets" processing.path.missingReferences, which is BY DESIGN (the event listeners removal will happen by changing the processor signature)
                const missingReferenceIdentifiers = processor.preProcessed.symbolTable.filter(({ content }) => isAnAlias(content)) // get all identifiers in the "shape" of an alias
                set(
                  object.metadata,
                  `processing['${path}'].missingReferences`,
                  missingReferenceIdentifiers.map(({ content }) => content),
                )

                // 4.3 Proxy update:property to missing references into compute:modes
                if (missingReferenceIdentifiers.length > 0) {
                  const propertyPatterns = missingReferenceIdentifiers.map(({ content }) => PROPERTY(REFERENCE(`alias`, content), `level`))

                  const proxy = strategy.proxy(object, manager.eventEmitter)
                  proxy({ type: `update:property`, properties: propertyPatterns }, `compute:modes:process`).bindSignature([processorSignature])
                }
              }
            }

            if (bonus) {
              const target = bonus[0].target

              const proxy = strategy.proxy(object, manager.eventEmitter)
              proxy({ type: `reference:indexed`, references: [REFERENCE(`alias`, target)] }, `compute:bonus`)
            }

            modes.push(mode)
          }

          instructions.push(SET(`modes`, modes))
        }

        return instructions
      },
    })
  })
  .addFunction(`compute:name`, object => ({ manager, event }) => {
    manager.mutator.enqueue(object.reference(`id`), {
      name: `compute:name`,
      fn: () => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)),
    })
  })
  // TODO: Inject into context stuff about the match
  .onUpdateProperty(`compute:modes:process`, [PROPERTY(PLACEHOLDER_SELF_REFERENCE, REGEX(/__.processing.(.*).signature/))], (object, strategy) => ({ manager }) => {
    manager.mutator.enqueue(object.reference(`id`), {
      name: `compute:modes:process`,
      fn: () => {
        const index = 0 // TODO: Get index from somewhere
        const path = `_.GCA.modes[${index}].value`

        const processorSignature = Signature.fromData(object.id, path, object.data)
        const processor: Processor = get(object.metadata, `processing['${path}'].processor`)

        assert(processor, `Tree Processor not found for "${path}"`)

        // 1. TODO: Build environment
        const knownMissingReferences = get(object.metadata, `processing['${path}'].missingReferences`, [])

        const environment = new Environment()
        for (const reference of knownMissingReferences) {
          const [object] = manager.objects.getByReference(new Reference(`alias`, reference))

          // if reference is found
          if (object && !isNil(object.data.level)) {
            environment.addObjectSource(reference, {
              [reference]: object.data.level,
            })
          }
        }

        // 2. Finish processing
        const processedData = processor.process(environment)

        // If value is not ready
        if (!processedData.isReady) {
          // 3. Store "processing" missing references (i.e. references that we only know are needed AFTER an initial processing step)
          //      [PROCESSING REFERENCES]
          const missingReferenceIdentifiers = processor.preProcessed.symbolTable.filter(({ content }) => isAnAlias(content) && !knownMissingReferences.includes(content)) // get all identifiers in the "shape" of an alias
          set(object.metadata, `processing['${path}'].missingReferences`, [...knownMissingReferences, ...missingReferenceIdentifiers.map(({ content }) => content)])

          // 4. Proxy update:property to missing references into compute:modes (only for new/unknown missing references — i.e. those that were not known before)
          if (missingReferenceIdentifiers.length > 0) {
            const propertyPatterns = missingReferenceIdentifiers.map(({ content }) => PROPERTY(REFERENCE(`alias`, content), `level`))

            const proxy = strategy.proxy(object, manager.eventEmitter)
            proxy({ type: `update:property`, properties: propertyPatterns }, `compute:modes:process`).bindSignature([processorSignature])
          }

          // nothing to set yet
          return []
        }

        // Value is ready, set it
        const value = processedData.tree.expression()

        const computedPath = `modes[${index}].value`

        processorSignature.value = `aaaaa`
        return [OVERRIDE(computedPath, value), processorSignature.instruction()]
      },
    })
  })
  .addFunction(`compute:bonus`, object => ({ manager, event }: ListenerFunctionContext<ReferenceIndexedEvent_Handle>) => {
    const [target] = manager.objects.getByReference(event.reference)
    if (!target) return

    manager.mutator.enqueue(event.reference, {
      name: `compute:bonus`,
      fn: () => {
        const modeIndex = 1 // TODO: Get index from somewhere
        const bonusIndex = 0
        const mode = get(object.data, `_.GCA.modes[${modeIndex}]`)

        const bonus = parseInt(mode.bonus[bonusIndex].value)
        const level = get(target.data, `level`)

        assert(!isNaN(bonus), `Bonus "${bonus}" is not a number`)
        assert(!isNaN(level), `Level "${level}" is not a number`)

        return [OVERRIDE(`level`, level + bonus)]
      },
    })
  })
  //
  .addListener(
    {
      type: `update:property`,
      properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA`)],
    },
    `GCA:initialize`,
  )
  .addListener(
    {
      type: `update:property`,
      properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA.name`), PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.INPUT.name`)],
    },
    `compute:name`,
  )
