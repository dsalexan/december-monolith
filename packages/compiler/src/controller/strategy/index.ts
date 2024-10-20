import assert from "assert"
import { get, isNil, isString, property, set } from "lodash"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE } from "@december/utils/access"

import MutableObject from "../../object"

import ObjectIntegrityRegistry, { IntegrityEntry } from "../integrityRegistry"
import { GenericMutationFrame } from "../frameRegistry"
import { PROPERTY_UPDATED, TargetEvent, TargetPropertyUpdatedEvent } from "../eventEmitter/event"
import { GenericListener, getListenerID, Listener } from "../eventEmitter/listener"
import { BareExecutionContext } from "../callQueue"

import { preProcess, reProcess, PreProcessOptions as _PreProcessOptions, ReProcessOptions as _ReProcessOptions } from "../../processor"
import { DELETE, Mutation, OVERRIDE, SET } from "../../mutation/mutation"

import type ObjectController from ".."
import { BasePattern } from "../../../../utils/src/match/base"

export type Generator<TReturn> = (object: MutableObject) => TReturn

export interface ProcessingPath {
  original: string
  target: string
}

export interface ProxyListenerOptions {
  arguments?: BareExecutionContext[`arguments`]
  integrityEntries?: IntegrityEntry[]
}

export type PreProcessOptions = _PreProcessOptions & {
  name?: string
  executionContext: BareExecutionContext
} & ProxyListenerOptions

export type ReProcessOptions = _ReProcessOptions
export type ReProcessOptionsGenerator = (controller: ObjectController) => ReProcessOptions

export class Strategy {
  frameRegistry: Map<GenericMutationFrame[`name`], GenericMutationFrame>
  listenerGenerators: Generator<GenericListener>[]

  constructor() {
    this.frameRegistry = new Map()
    this.listenerGenerators = []
  }

  // #region BASIC APPLICATIONS

  /** Registers a generic mutation function */
  public registerMutationFunction(name: GenericMutationFrame[`name`], fn: GenericMutationFrame[`fn`]): this {
    const mutationFrame: GenericMutationFrame = { name, fn }

    assert(!this.frameRegistry.has(mutationFrame.name), `Mutation Frame with name "${name}" already exists`)

    this.frameRegistry.set(mutationFrame.name, mutationFrame)

    return this
  }

  /** Register a listener generator (target event + callback to be called on event triggering, basically) */
  public addListener(targetEvent: TargetEvent, callback: Generator<GenericListener[`callback`]>, integrityEntries: GenericListener[`integrityEntries`] = []): this {
    const listenerGenerator: Generator<GenericListener> = (object: MutableObject) => {
      return {
        targetEvent: resolveTargetEvent(object, targetEvent),
        callback: callback(object),
        integrityEntries,
      }
    }

    this.listenerGenerators.push(listenerGenerator)

    return this
  }

  // #endregion

  // #region COMMON APPLICATION

  /** Register a PropertyUpdated listener generator */
  public onPropertyUpdated(properties: TargetPropertyUpdatedEvent[`properties`], callbackGenerator: Generator<GenericListener[`callback`]>, integrityEntries?: GenericListener[`integrityEntries`]): this {
    const targetEvent: TargetPropertyUpdatedEvent = {
      type: `property:updated`,
      properties,
    }

    return this.addListener(targetEvent, callbackGenerator, integrityEntries)
  }

  /** Register a generic mutation function AND a PropertyUpdated listener generator that ALREADY enqueues that function on callback */
  public onPropertyUpdatedEnqueue(properties: TargetPropertyUpdatedEvent[`properties`], name: GenericMutationFrame[`name`], fn: GenericMutationFrame[`fn`], options: Partial<CommonOptions> = {}): this {
    this.registerMutationFunction(name, fn)

    const callbackGenerator: Generator<GenericListener[`callback`]> = (object: MutableObject) => {
      return (event, metadata) => {
        const bareExecutionContext: BareExecutionContext = { eventDispatcher: event, name }
        if (options.arguments) bareExecutionContext.arguments = options.arguments

        metadata.eventEmitter.controller.callQueue.enqueue(object.reference(), bareExecutionContext)
      }
    }

    this.onPropertyUpdated(properties, callbackGenerator, options.integrityEntries)

    return this
  }

  /** Adds a proxy listener to another function. Exclusively called inside mutation functions */
  public static addProxyListener(targetEvent: TargetEvent, name: GenericMutationFrame[`name`], options: ProxyListenerOptions = {}) {
    // 1. Build callback generator
    const callbackGenerator: Generator<GenericListener[`callback`]> = (origin: MutableObject) => {
      return (event, { listener, eventEmitter }) =>
        eventEmitter.controller.callQueue.enqueue(origin.reference(), {
          eventDispatcher: event,
          name,
          arguments: { ...(options.arguments ?? {}), originReference: origin.reference() },
        })
    }

    // 2. Build generic listener generator
    const genericListenerGenerator: Generator<GenericListener> = (origin: MutableObject) => {
      return {
        targetEvent: resolveTargetEvent(origin, targetEvent),
        callback: callbackGenerator(origin),
        integrityEntries: options.integrityEntries ?? [],
      }
    }

    // 3. Build listener generator
    const listenerGenerator: Generator<Listener> = (origin: MutableObject) => {
      const genericListener = genericListenerGenerator(origin)
      return {
        ...genericListener,
        id: getListenerID(origin.id, genericListener),
      }
    }

    // 4. Return listener generator + event adder
    return (origin: MutableObject) => {
      const listener: Listener = listenerGenerator(origin)
      origin.controller.eventEmitter.addListener(listener)
    }
  }

  // #endregion

  // #region PROCESSING/COMPILLING

  public static preProcess(origin: MutableObject, path: ProcessingPath, options: PreProcessOptions): { mutations: Mutation[]; integrityEntries: IntegrityEntry[] } {
    // 1. Pre-process expression
    const expression = get(origin.data, path.original)
    assert(isString(expression), `Expression is not a string to be pre-processed`)
    const preProcessedValue = preProcess(expression, { ...options })

    // 2. If value is ready, set it
    if (preProcessedValue.isReady) {
      const computedValue = preProcessedValue.data.tree.value()
      return { mutations: [OVERRIDE(path.target, computedValue)], integrityEntries: [] }
    }

    const mutations: Mutation[] = []

    // 3. If value is not ready, store current processing data AND listen for those missing references at CONTROLLER LEVEL
    const state = preProcessedValue.saveState(origin, path.target)
    preProcessedValue.saveMissingIdentifiers(origin)
    preProcessedValue.listenForMissingIdentifiers(Strategy.addProxyListener, origin, options.name ?? `compute:processing`, { ...options.arguments, path })

    return { mutations: [...mutations, ...state.mutations], integrityEntries: state.integrityEntries }
  }

  public registerProcessingFunction(name: GenericMutationFrame[`name`], optionsGenerator: ReProcessOptionsGenerator): this {
    this.registerMutationFunction(name, (object: MutableObject, { arguments: args }) => {
      // arguments: AnyObject
      // executionContext: ExecutionContext<TEvent>
      // callQueue: ObjectCallQueue
      // frameRegistry: ObjectFrameRegistry

      const { path } = args as { path: { original: string; target: string } }
      assert(!isNil(path), `Path for processing (raw and computed) was not specified`)

      const options = optionsGenerator(object.controller)

      // 1. Finish processing value (now with access to a built environment)
      const processedValue = reProcess(object, path.target, options)

      // 2. Value is ready, pass instruction
      if (processedValue.isReady) {
        const computedValue = processedValue.data.tree.value()

        debugger
        // // DEBUG: This is just to simulate a "signature change"
        // // ====================================================
        // processedValue.signature.value = `aaaaa`
        // return [OVERRIDE(path.computed, computedValue), processedValue.signature.instruction()]
        // // ====================================================

        return [OVERRIDE(path.target, computedValue)]
      }

      // 3. Value is not ready, proxy PropertyUpdate to missing references (only for new/unknown missing references — i.e. those that were not known before)
      processedValue.saveMissingIdentifiers(object)
      processedValue.listenForMissingIdentifiers(Strategy.addProxyListener, object, name, { ...args, path })

      // 4. Remove current computed value
      return [DELETE(path.target)]
    })

    return this
  }

  // #endregion
}

export interface CommonOptions {
  integrityEntries?: GenericListener[`integrityEntries`]
  arguments?: BareExecutionContext[`arguments`]
}

export function resolveTargetEvent(object: MutableObject, targetEvent: TargetEvent): TargetEvent {
  if (targetEvent.type === `property:updated`) {
    return {
      ...targetEvent,
      properties: targetEvent.properties.map(property => {
        let propertyPattern = property.propertyPattern
        let referencePattern = property.referencePattern

        if (referencePattern instanceof BasePattern) return property
        else if (referencePattern === PLACEHOLDER_SELF_REFERENCE) referencePattern = REFERENCE(`id`, object.id)
        else throw new Error(`Unimplemented scenario`)

        return PROPERTY(referencePattern, propertyPattern)
      }),
    }
  } else if (targetEvent.type === `reference:added`) {
    return { ...targetEvent }
  }

  throw new Error(`Unimplemented event type "${targetEvent.type}"`)
}
