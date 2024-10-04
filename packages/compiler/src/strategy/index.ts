import { EventEmitter } from "@billjs/event-emitter"
import { get, isArray, isNil, isString, set } from "lodash"
import { v4 as uuidv4 } from "uuid"

import { ANY_PROPERTY, PROPERTY, PropertyReference, PropertyReferencePattern, REFERENCE, PLACEHOLDER_SELF_REFERENCE, Reference } from "@december/utils/access"
import { OR } from "@december/utils/match/logical"
import { ElementPattern, EQUALS, REGEX } from "@december/utils/match/element"
import { BasePattern } from "@december/utils/match/base"
import { UnitManager } from "@december/utils/unit"

import ObjectEventEmitter, { ListenerFunction, ListenerFunctionContext } from "./../manager/events/emitter"
import { SET, OVERRIDE } from "../mutation"
import MutableObject from "../object"
import assert from "assert"
import { DELETE, Mutation } from "../mutation/mutation"
import { MutationGenerator, MutationHash } from "../manager/mutator"
import makeProcessor, { Environment, ProcessedData, Processor } from "../tree"
import { Event_Listen } from "../manager/events"
import { SIGNATURE, Signature, SignaturePattern } from "../manager/events/signature"
import { EventDispatched, ReferenceEventTrace, SignatureChangedEventTrace, SignatureUpdatedEvent_Handle } from "../manager/events/events"
import { IdentifierSymbolToPropertyPattern, IsProxiableIdentifier, preProcessValue, PreProcessValueOptions, ProcessingOptions, processValue, ReferenceToSource } from "../processor"
import { MaybeNil, MaybeUndefined } from "tsdef"

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

export type FunctionGenerator = (object: MutableObject, strategy: Strategy, mutationHash?: MutationHash) => ListenerFunction
export type ContextualizedMutationGenerator = (object: MutableObject, strategy: Strategy) => (context: ListenerFunctionContext) => ReturnType<MutationGenerator[`fn`]>
export type ProcessingOptionsGenerator = (object: MutableObject, strategy: Strategy) => (context: ListenerFunctionContext) => ProcessingOptions

type FunctionName = string
type FunctionHash = MutationHash
type HashableFunctionName = FunctionName | [FunctionName, FunctionHash] | ((event: Event_Listen) => FunctionName | [FunctionName, FunctionHash])

function parseFunctionName(arg: HashableFunctionName): (event: Event_Listen) => [FunctionName, MaybeUndefined<FunctionHash>] {
  if (isString(arg)) return (event: Event_Listen) => [arg, undefined]
  if (isArray(arg)) return (event: Event_Listen) => arg
  if (typeof arg === `function`) {
    return (event: Event_Listen) => {
      const name = arg(event)
      return parseFunctionName(name)(event)
    }
  }

  throw new Error(`Invalid function name`)
}

export interface EventListener {
  event: Event_Listen
  fn: HashableFunctionName
}

export class Strategy {
  generators: Map<FunctionName, FunctionGenerator> = new Map() // function name -> function declaration generator
  listeners: EventListener[] = []

  constructor() {}

  addFunction(name: string, fn: FunctionGenerator) {
    this.generators.set(name, fn)

    return this
  }

  addMutatingFunction(name: string, fn: ContextualizedMutationGenerator) {
    const functionGenerator: FunctionGenerator = (object, strategy, mutationHash) => context => {
      context.manager.mutator.enqueue(
        object.reference(`id`), //
        { name, fn: () => fn(object, strategy)(context) },
        { event: context.event },
        mutationHash,
      )
    }

    this.addFunction(name, functionGenerator)

    return this
  }

  addProcessingFunction(name: string, processingOptionsGenerator: ProcessingOptionsGenerator) {
    this.addMutatingFunction(
      name, //
      (object, strategy) => context => {
        const { manager, event, data } = context
        const { referenceToSource, isProxiableIdentifier, identifierSymbolToPropertyPattern } = processingOptionsGenerator(object, strategy)(context)
        const path = getProcessingPath(data.path)

        assert(!isNil(path), `Path for processing (raw and computed) was not specified`)

        // 1. Finish processing value (now with access to a built environment)
        const processedValue = processValue(path.raw, object, referenceToSource)

        // 2. Value is ready, pass instruction
        if (processedValue.isReady) {
          const computedValue = processedValue.data.tree.value()

          // // DEBUG: This is just to simulate a "signature change"
          // // ====================================================
          // processedValue.signature.value = `aaaaa`
          // return [OVERRIDE(path.computed, computedValue), processedValue.signature.instruction()]
          // // ====================================================

          return [OVERRIDE(path.computed, computedValue)]
        }

        // Value is not ready
        const proxy = strategy.proxy(object, manager.eventEmitter)

        // 3. Proxy update:property to missing references into compute:modes (only for new/unknown missing references — i.e. those that were not known before)
        processedValue.doMissingIdentifiers(isProxiableIdentifier)
        processedValue.doProxy(proxy, identifierSymbolToPropertyPattern, data)

        // 4. Remove current computed value
        return [DELETE(path.computed)]
      },
    )

    return this
  }

  addListener(event: Event_Listen, name: HashableFunctionName) {
    const functionName = parseFunctionName(name)(event)[0]

    assert(this.generators.has(functionName), `Function "${functionName}" not found`)

    this.listeners.push({
      event,
      fn: name,
    })

    return this
  }

  onEventMutatingFunction(event: Event_Listen, name: HashableFunctionName, fn: ContextualizedMutationGenerator) {
    const functionName = parseFunctionName(name)(event)[0]

    this.addMutatingFunction(functionName, fn)
    this.addListener(event, name)

    return this
  }

  onUpdateProperty(properties: PropertyReferencePattern[], name: HashableFunctionName, fn: FunctionGenerator) {
    const event: Event_Listen = { type: `update:property`, properties }

    const functionName = parseFunctionName(name)(event)[0]

    this.addFunction(functionName, fn)
    this.addListener(event, name)

    return this
  }

  onUpdatePropertyMutatingFunction(properties: PropertyReferencePattern[], name: HashableFunctionName, fn: ContextualizedMutationGenerator) {
    this.onEventMutatingFunction(
      {
        type: `update:property`,
        properties,
      },
      name,
      fn,
    )

    return this
  }

  onUpdatePropertyProcessingFunction(properties: PropertyReferencePattern[], name: HashableFunctionName, processingOptionsGenerator: ProcessingOptionsGenerator) {
    const event: Event_Listen = { type: `update:property`, properties }

    const functionName = parseFunctionName(name)(event)[0]

    this.addProcessingFunction(functionName, processingOptionsGenerator)
    this.addListener(event, name)

    return this
  }

  // STRUCTURAL

  /** Listen to all listenable functions in strategy */
  applyStrategy(object: MutableObject, eventEmitter: ObjectEventEmitter) {
    // 1. Add listeners to event emitter
    const listen = this.listen(object, eventEmitter)

    for (const { event, fn } of this.listeners) listen(event, fn)
  }

  /** Generates a listen method wrapped around a tuple (object, eventEmitter) */
  listen(object: MutableObject, eventEmitter: ObjectEventEmitter) {
    return (event: Event_Listen, name: HashableFunctionName) => {
      const [functionName, functionHash] = parseFunctionName(name)(event)

      const fnGenerator = this.generators.get(functionName)
      assert(fnGenerator, `Function "${functionName}" not found`)
      const fn = fnGenerator(object, this, functionHash)

      const _hash = isString(functionHash) ? `::${functionHash}` : ``
      const id = `${object.id}::${functionName}${_hash}`
      eventEmitter.on(fillEvent(event, object), { id, fn })
    }
  }

  /** Generates a proxy method wrapped around a tuple (object, eventEmitter) */
  proxy(object: MutableObject, eventEmitter: ObjectEventEmitter) {
    return (event: Event_Listen, name: HashableFunctionName) => {
      const [functionName, functionHash] = parseFunctionName(name)(event)

      const fnGenerator = this.generators.get(functionName)

      assert(fnGenerator, `Function "${name}" not found`)

      const fn = fnGenerator(object, this, functionHash)

      const _hash = isString(functionHash) ? `::${functionHash}` : ``
      const id = `${object.id}::(proxy)::${functionName}${_hash}`
      eventEmitter.on(fillEvent(event, object), { id, fn })

      return {
        bindSignature: (...signatures: Signature[]) => {
          const patterns = signatures.map(signature => SIGNATURE(signature.id, signature.value))
          eventEmitter.on(
            { type: `signature:updated`, signatures: patterns },
            {
              id: `${object.id}::(signature):${name}`,
              fn: context => {
                const signatureEvent = context.event as EventDispatched<SignatureUpdatedEvent_Handle>

                const signatures = patterns.filter(pattern => pattern.match(signatureEvent.id))

                // all relevant signatures should have the same value
                const unexpectedSignatures = signatures.filter(pattern => !pattern.valuePattern.match(signatureEvent.value))

                if (unexpectedSignatures.length > 0) {
                  eventEmitter.off(event.type, id) // remove proxy listener event
                  eventEmitter.off(signatureEvent.type, context.listenerID) // remove signature listener event (this one)

                  // dequeue all related commands
                  const trace: SignatureChangedEventTrace = {
                    type: `signature-changed`,
                    id: unexpectedSignatures.map(pattern => pattern.idPattern.toString()).join(`, `),
                    currentValue: signatureEvent.value!,
                    expectedValue: unexpectedSignatures.map(pattern => pattern.valuePattern.toString()).join(`, `),
                  }
                  context.manager.mutator.dequeue(
                    object.reference(`id`), //
                    functionName,
                    { event: { ...signatureEvent, trace } },
                    functionHash,
                  )
                }
              },
            },
          )
        },
      }
    }
  }

  /** Generates a preProcess method wrapped around a tuple (object, eventEmitter) */
  preProcess(object: MutableObject, eventEmitter: ObjectEventEmitter, unitManager: UnitManager) {
    return (data: Event_Listen[`data`] & { path: ProcessingPath }, targetFunction: string | [string, string], options: PreProcessValueOptions): Mutation[] => {
      const path = getProcessingPath(data.path)

      // 1. Pre-process data
      const rawValue = get(object.data, path.raw)
      const preProcessedValue = preProcessValue(rawValue, path.raw, { ...options, unitManager })

      // 2. If value is ready, set it
      if (preProcessedValue.isReady) {
        const computedValue = preProcessedValue.data.tree.value()
        return [OVERRIDE(path.computed, computedValue)]
      }

      const instructions: Mutation[] = []

      // 3. If value is not ready, listen for those references at MANAGER LEVEL
      instructions.push(...preProcessedValue.doSignature(object))
      const missingReferenceIdentifiers = preProcessedValue.doMissingIdentifiers(object, options.isProxiableIdentifier)

      // 3.1 Proxy update:property to missing references into compute:modes
      if (missingReferenceIdentifiers.length > 0) {
        const propertyPatterns = missingReferenceIdentifiers.map(options.identifierSymbolToPropertyPattern)

        const hashedFunction = isArray(targetFunction) ? targetFunction : ([targetFunction, path.raw] as [string, string])

        const proxy = this.proxy(object, eventEmitter)
        proxy({ type: `update:property`, properties: propertyPatterns, data }, hashedFunction).bindSignature(preProcessedValue.getSignature())
      }

      return instructions
    }
  }
}

function fillEvent(event: Event_Listen, object: MutableObject): Event_Listen {
  if (event.type === `update:property`) {
    return {
      type: `update:property`,
      properties: event.properties.map(property => {
        if (property.referencePattern instanceof BasePattern) return property
        return PROPERTY(REFERENCE(`id`, object.id), property.propertyPattern)
      }),
      data: event.data,
    }
  } else if (event.type === `reference:indexed`) {
    return {
      type: `reference:indexed`,
      references: event.references.map(reference => reference),
      data: event.data,
    }
  }

  // @ts-ignore
  throw new Error(`Unimplemented event type "${event.type}"`)
}

export interface ProcessingPath_Object {
  raw: string
  computed: string
}

export type ProcessingPath_Tuple = [string, string]

export type ProcessingPath = ProcessingPath_Object | ProcessingPath_Tuple

export function getProcessingPath(path: ProcessingPath): ProcessingPath_Object {
  if (isArray(path)) return { raw: path[0], computed: path[1] }

  return path
}
