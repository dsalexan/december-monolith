import { get, isNil, set } from "lodash"

import { ANY_PROPERTY, PROPERTY, SELF_PROPERTY, PropertyReference, PropertyReferencePattern, REFERENCE, PLACEHOLDER_SELF_REFERENCE, Reference } from "@december/utils/access"
import { OR } from "@december/utils/match/logical"
import { EQUALS, REGEX } from "@december/utils/match/element"
import { BasePattern } from "@december/utils/match/base"

import ObjectEventEmitter, { ListenerFunctionContext } from "./manager/events/emitter"
import { SET, OVERRIDE } from "./mutation"
import MutableObject from "./object"
import assert from "assert"
import { DELETE, Mutation } from "./mutation/mutation"
import { DYNAMIC_MUTATION_HASH, MutationGenerator } from "./manager/mutator"
import makeProcessor, { Environment, ProcessedData, Processor } from "./tree"
import { Event_Listen } from "./manager/events"
import { ProcessingOptionsGenerator, Strategy } from "./strategy"
import { ReferenceIndexedEvent_Handle } from "./manager/events/events"
import { SIGNATURE, Signature } from "./manager/events/signature"
import { preProcessValue, PreProcessValueOptions, ProcessingOptions, processValue } from "./processor"

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

const GCABaseProcessingOptions: Omit<ProcessingOptions, `referenceToSource`> = {
  isProxiableIdentifier: ({ content }) => isAnAlias(content),
  // TODO: It is not always going to be "level"
  identifierSymbolToPropertyPattern: ({ content }) => PROPERTY(REFERENCE(`alias`, content), `level`),
}

const GCAProcessingOptionsGenerator: ProcessingOptionsGenerator =
  object =>
  ({ manager }) => ({
    referenceToSource: referenceKey => {
      const [object] = manager.objects.getByReference(new Reference(`alias`, referenceKey))

      // if reference is found
      // TODO: It is not always going to be "level"
      if (object && !isNil(object.data.level)) return { [referenceKey]: object.data.level }

      return null
    },
    ...GCABaseProcessingOptions,
  })

const GCAPreProcessingOptionsGenerator: (rootScope: `math` | `text-processing`) => PreProcessValueOptions = (rootScope: `math` | `text-processing`) => ({
  scope: { root: rootScope },
  debug: false,
  //
  ...GCABaseProcessingOptions,
})

export const DEFAULT_STRATEGY = new Strategy()
  // // A.1. Function (with manual pre-processing)
  // .addFunction(`GCA:initialize`, (object, strategy) => ({ manager, event }) => {
  //   manager.mutator.enqueue(
  //     object.reference(`id`),
  //     {
  //       name: `GCA:initialize`,
  //       fn: () => {
  //         const { modes: _modes, level } = object.data._.GCA

  //         const instructions: Mutation[] = [SET(`__.aliases`, [`TR:${object.id === `1` ? `Uno` : `Dos`}`])]

  //         if (!isNil(level)) {
  //           const numericLevel = parseInt(level)
  //           assert(!isNaN(numericLevel), `Level "${level}" is not a number`)

  //           instructions.push(SET(`level`, numericLevel))
  //         }

  //         if (_modes) {
  //           const modes: unknown[] = []
  //           for (const [index, { id, name, value, bonus }] of _modes.entries()) {
  //             const mode = { id, name }

  //             if (value) {
  //               const path = {
  //                 raw: `_.GCA.modes[${index}].value`,
  //                 computed: `modes[${index}].value`,
  //               }

  //               // 1. Pre-process data
  //               const preProcessedValue = preProcessValue(value, path.raw, {
  //                 scope: { root: `math` },
  //                 debug: false,
  //               })

  //               // 2. If value is ready, set it
  //               if (preProcessedValue.isReady) {
  //                 mode[`value`] = preProcessedValue.data.tree.expression()
  //                 continue
  //               }

  //               // 3. If value is not ready, listen for those references at MANAGER LEVEL
  //               instructions.push(...preProcessedValue.doSignature(object))
  //               const missingReferenceIdentifiers = preProcessedValue.doMissingIdentifiers(object, ({ content }) => isAnAlias(content))

  //               // 3.1 Proxy update:property to missing references into compute:modes
  //               if (missingReferenceIdentifiers.length > 0) {
  //                 const propertyPatterns = missingReferenceIdentifiers.map(({ content }) => PROPERTY(REFERENCE(`alias`, content), `level`))

  //                 const proxy = strategy.proxy(object, manager.eventEmitter)
  //                 proxy({ type: `update:property`, properties: propertyPatterns, data: { path } }, `compute:modes:process`).bindSignature(preProcessedValue.getSignature())
  //               }
  //             }

  //             if (bonus) {
  //               const target = bonus[0].target

  //               const proxy = strategy.proxy(object, manager.eventEmitter)
  //               proxy({ type: `reference:indexed`, references: [REFERENCE(`alias`, target)], data: { modeIndex: index, bonusIndex: 0 } }, `compute:bonus`)
  //             }

  //             modes.push(mode)
  //           }

  //           instructions.push(SET(`modes`, modes))
  //         }

  //         return instructions
  //       },
  //     },
  //     event.trace,
  //   )
  // })
  // // A.2. Function (with AUTO pre-processing)
  // .addFunction(`GCA:initialize`, (object, strategy) => ({ manager, event }) => {
  //   manager.mutator.enqueue(
  //     object.reference(`id`),
  //     {
  //       name: `GCA:initialize`,
  //       fn: () => {
  //         const { modes: _modes, level } = object.data._.GCA

  //         const instructions: Mutation[] = [SET(`__.aliases`, [`TR:${object.id === `1` ? `Uno` : `Dos`}`])]

  //         if (!isNil(level)) {
  //           const numericLevel = parseInt(level)
  //           assert(!isNaN(numericLevel), `Level "${level}" is not a number`)

  //           instructions.push(SET(`level`, numericLevel))
  //         }

  //         if (_modes) {
  //           const modes: unknown[] = []
  //           for (const [index, { id, name, value, bonus }] of _modes.entries()) {
  //             const mode = { id, name }

  //             if (value) {
  //               // 1. Pre-process data (saving signatures, missing references AND firing proxy strategies)
  //               const preProcess = strategy.preProcess(object, manager.eventEmitter)
  //               const preProcessedInstructions = preProcess(
  //                 { path: [`_.GCA.modes[${index}].value`, `modes[${index}].value`] }, //
  //                 `compute:processing`,
  //                 GCAPreProcessingOptionsGenerator(`math`),
  //               )
  //               instructions.push(...preProcessedInstructions)
  //             }

  //             if (bonus) {
  //               const target = bonus[0].target

  //               const proxy = strategy.proxy(object, manager.eventEmitter)
  //               proxy({ type: `reference:indexed`, references: [REFERENCE(`alias`, target)], data: { modeIndex: index, bonusIndex: 0 } }, `compute:bonus`)
  //             }

  //             modes.push(mode)
  //           }

  //           instructions.push(SET(`modes`, modes))
  //         }

  //         return instructions
  //       },
  //     },
  //     event.trace,
  //   )
  // })
  // A.3. Function (with AUTO enqueueing AND auto processing)
  .addMutatingFunction(`GCA:initialize`, (object, strategy) => ({ manager }) => {
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
          // 1. Pre-process data (saving signatures, missing references AND firing proxy strategies)
          const preProcess = strategy.preProcess(object, manager.eventEmitter)
          const preProcessedInstructions = preProcess(
            { path: [`_.GCA.modes[${index}].value`, `modes[${index}].value`] }, //
            `compute:processing`,
            GCAPreProcessingOptionsGenerator(`math`),
          )
          instructions.push(...preProcessedInstructions)
        }

        if (bonus) {
          const target = bonus[0].target

          const proxy = strategy.proxy(object, manager.eventEmitter)
          proxy({ type: `reference:indexed`, references: [REFERENCE(`alias`, target)], data: { modeIndex: index, bonusIndex: 0 } }, `compute:bonus`)
        }

        modes.push(mode)
      }

      instructions.push(SET(`modes`, modes))
    }

    return instructions
  })
  // // B.1. Function + Listener
  // .addFunction(`compute:name`, object => ({ manager, event }) => {
  //   manager.mutator.enqueue(
  //     object.reference(`id`),
  //     {
  //       name: `compute:name`,
  //       fn: () => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)),
  //     },
  //     event.trace,
  //   )
  // })
  // .addListener(
  //   {
  //     type: `update:property`,
  //     properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA.name`), PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.INPUT.name`)],
  //   },
  //   `compute:name`,
  // )
  // // B.2. MutatingFunction + Listener
  // .addMutatingFunction(`compute:name`, object => context => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)))
  // .addListener(
  //   {
  //     type: `update:property`,
  //     properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA.name`), PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.INPUT.name`)],
  //   },
  //   `compute:name`,
  // )
  // B.3. ListenerMutatingFunction
  // .onEventMutatingFunction(
  //   {
  //     type: `update:property`,
  //     properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA.name`), PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.INPUT.name`)],
  //   },
  //   `compute:name`,
  //   object => context => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)),
  // )
  // // B.4. onUpdatePropertyMutatingFunction (WITH dynamic hash)
  // .onUpdatePropertyMutatingFunction(
  //   [SELF_PROPERTY(`_.GCA.name`), SELF_PROPERTY(`_.INPUT.name`)], //
  //   [`compute:name`, DYNAMIC_MUTATION_HASH.EVENT_MATCH],
  //   object => context => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)),
  // )
  // B.5. onUpdatePropertyMutatingFunction (without dynamic hash)
  .onUpdatePropertyMutatingFunction(
    [SELF_PROPERTY(`_.GCA.name`), SELF_PROPERTY(`_.INPUT.name`)], //
    `compute:name`,
    object => context => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)),
  )
  //
  //
  // // C.1. OnUpdateProperty (manual enqueueing?)
  // .onUpdateProperty([PROPERTY(PLACEHOLDER_SELF_REFERENCE, REGEX(/__.processing.(.*).signature/))], `compute:modes:process`, (object, strategy) => ({ manager, data, event }) => {
  //   manager.mutator.enqueue(
  //     object.reference(`id`),
  //     {
  //       name: `compute:modes:process`,
  //       fn: () => {
  //         const { index } = data

  //         assert(!isNil(index), `Index "${index}" is not a number`)

  //         const path = `_.GCA.modes[${index}].value`
  //         const computedPath = `modes[${index}].value`

  //         // 1. Finish processing value (now with access to a built environment)
  //         const processedValue = processValue(path, object, referenceKey => {
  //           const [object] = manager.objects.getByReference(new Reference(`alias`, referenceKey))

  //           // if reference is found
  //           if (object && !isNil(object.data.level)) return { [referenceKey]: object.data.level }

  //           return null
  //         })

  //         // 2. Value is ready, pass instruction
  //         if (processedValue.isReady) {
  //           const value = processedValue.data.tree.expression()
  //           // return [OVERRIDE(computedPath, value)]

  //           processedValue.signature.value = `aaaaa`
  //           return [OVERRIDE(computedPath, value), processedValue.signature.instruction()]
  //         }

  //         // Value is not ready
  //         const proxy = strategy.proxy(object, manager.eventEmitter)

  //         // 3. Proxy update:property to missing references into compute:modes (only for new/unknown missing references — i.e. those that were not known before)
  //         processedValue.doMissingIdentifiers(content => isAnAlias(content))
  //         // TODO: It is not always going to be "level"
  //         processedValue.doProxy(proxy, ({ content }) => PROPERTY(REFERENCE(`alias`, content), `level`), { index })

  //         // 4. Remove current computed value
  //         return [DELETE(computedPath)]
  //       },
  //     },
  //     event.trace,
  //   )
  // })
  // // C.2. OnUpdateProperty (auto enqueueing)
  // .onUpdatePropertyMutatingFunction(
  //   [SELF_PROPERTY(REGEX(/__.processing.(.*).signature/))], //
  //   `compute:modes:process`,
  //   (object, strategy) =>
  //     ({ manager, event, data }) => {
  //       const { path } = data as { path: { raw: string; computed: string } }

  //       assert(!isNil(path), `Path for processing (raw and computed) was not specified`)

  //       // const path = `_.GCA.modes[${index}].value`
  //       // const computedPath = `modes[${index}].value`

  //       // 1. Finish processing value (now with access to a built environment)
  //       const processedValue = processValue(path.raw, object, referenceKey => {
  //         const [object] = manager.objects.getByReference(new Reference(`alias`, referenceKey))

  //         // if reference is found
  //         if (object && !isNil(object.data.level)) return { [referenceKey]: object.data.level }

  //         return null
  //       })

  //       // 2. Value is ready, pass instruction
  //       if (processedValue.isReady) {
  //         const value = processedValue.data.tree.value()
  //         return [OVERRIDE(path.computed, value)]
  //       }

  //       // Value is not ready
  //       const proxy = strategy.proxy(object, manager.eventEmitter)

  //       // 3. Proxy update:property to missing references into compute:modes (only for new/unknown missing references — i.e. those that were not known before)
  //       processedValue.doMissingIdentifiers(({ content }) => isAnAlias(content))
  //       // TODO: It is not always going to be "level"
  //       processedValue.doProxy(proxy, ({ content }) => PROPERTY(REFERENCE(`alias`, content), `level`), data)

  //       // 4. Remove current computed value
  //       return [DELETE(path.computed)]
  //     },
  // )
  // // C.3. OnUpdatePropertyProcessing (auto enqueueing AND auto processing)
  // .onUpdatePropertyProcessingFunction([SELF_PROPERTY(REGEX(/__.processing.(.*).signature/))], `compute:modes:process`, GCAProcessingOptionsGenerator)
  // C.4. Generic Auto Processing
  .addProcessingFunction(`compute:processing`, GCAProcessingOptionsGenerator)
  //
  //
  .addFunction(`compute:bonus`, object => ({ manager, event, data }: ListenerFunctionContext<ReferenceIndexedEvent_Handle>) => {
    const [target] = manager.objects.getByReference(event.reference)
    if (!target) return

    manager.mutator.enqueue(
      event.reference,
      {
        name: `compute:bonus`,
        fn: () => {
          const { modeIndex, bonusIndex } = data

          assert(!isNil(modeIndex), `Mode index "${modeIndex}" is not a number`)
          assert(!isNil(bonusIndex), `Bonus index "${bonusIndex}" is not a number`)

          const mode = get(object.data, `_.GCA.modes[${modeIndex}]`)

          const bonus = parseInt(mode.bonus[bonusIndex].value)
          const level = get(target.data, `level`)

          assert(!isNaN(bonus), `Bonus "${bonus}" is not a number`)
          assert(!isNaN(level), `Level "${level}" is not a number`)

          return [OVERRIDE(`level`, level + bonus)]
        },
      },
      { event },
      DYNAMIC_MUTATION_HASH.EVENT_DATA,
    )
  })
  //
  .addListener(
    {
      type: `update:property`,
      properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA`)],
    },
    `GCA:initialize`,
  )
