import assert from "assert"
import { AnyObject, MaybeArray, MaybeUndefined, Nilable, Nullable } from "tsdef"
import { get, isNil, isString, property, set, uniq } from "lodash"

import { Processor, Simbol } from "@december/tree"
import { ProcessorBuildOptions } from "@december/tree/processor"
import generateUUID from "@december/utils/uuid"
import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, Reference, REFERENCE } from "@december/utils/access"
import { PropertyReferencePatternMatchInfo } from "@december/utils/access/match"
import { BasePattern, PatternMatchInfo } from "@december/utils/match/base"
import { RegexPatternMatchInfo } from "@december/utils/match/element"

import MutableObject from "../../object"

import ObjectIntegrityRegistry, { IntegrityEntry } from "../integrityRegistry"
import { GenericMutationFrame } from "../frameRegistry"
import { EventDispatcher, PROPERTY_UPDATED, PropertyUpdatedEvent, TargetEvent, TargetPropertyUpdatedEvent } from "../eventEmitter/event"
import { GenericListener, getListenerID, Listener } from "../eventEmitter/listener"
import { BareExecutionContext } from "../callQueue"

import { preProcess, reProcess, PreProcessOptions, ReProcessOptions } from "../../processor"
import { DELETE, Mutation, OVERRIDE, SET } from "../../mutation/mutation"

import type ObjectController from ".."
import { ArgumentProvider } from "../callQueue/executionContext"
// import { ProcessingPackage, ProcessingPath, ProcessingState, ProcessingSymbolTranslationTable } from "../../processor/base"
import { Environment } from "../../tree"
import { StrategyProcessingState, StrategyProcessListenOptions, StrategyProcessSymbolOptions } from "./processing"
import { MutationFunctionMetadata, MutationFunctionOutput } from "../frameRegistry/mutationFrame"
import logger, { paint } from "../../logger"
import SymbolTable, { SymbolValueInvoker } from "@december/tree/environment/symbolTable"
import { StrategyProcessingPackage, StrategyProcessBuildOptions, StrategyProcessor } from "./processing"

export { ProcessingSymbolTranslationTable } from "./translationTable"
export type { StrategyProcessingPackage, StrategyProcessListenOptions, StrategyProcessSymbolOptions, StrategyProcessBuildOptions } from "./processing"

export type Generator<TReturn> = (object: MutableObject) => TReturn

export interface ProxyListenerOptions {
  arguments?: BareExecutionContext[`arguments`]
  integrityEntries?: IntegrityEntry[]
}

// export type PreProcessOptions = _PreProcessOptions & {
//   name?: string
//   environmentGenerator?: EnvironmentGenerator
//   executionContext: BareExecutionContext
// } & ProxyListenerOptions

// export type ReProcessOptions = _ReProcessOptions & {
//   name?: string
//   environmentGenerator?: EnvironmentGenerator
// } & ProxyListenerOptions
// export type ReProcessOptionsGenerator = (controller: ObjectController) => ReProcessOptions

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
        if (options.argumentProvider) bareExecutionContext.argumentProvider = options.argumentProvider

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

  /** Generic processing for any expression */
  public static process(
    processingPackage: Nullable<StrategyProcessingPackage>,
    object: MutableObject,
    path: string,
    options: StrategyProcessSymbolOptions & StrategyProcessListenOptions & StrategyProcessBuildOptions & { ignorePackageUpdate?: boolean },
  ): { state: StrategyProcessingState; mutations: Mutation[]; integrityEntries: IntegrityEntry[] } {
    const listeners: Listener[] = []
    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    // 1. Check if expression was processed previously
    let state: StrategyProcessingState = get(object.metadata, path)

    // 2. Process expression
    if (!state) {
      // EXPRESSION WAS NOT PROCESSED YET
      assert(processingPackage, `Processing package must be provided for new expressions`)

      // 2.1. Process (build + solve) expression
      state = StrategyProcessor.process(processingPackage, options)

      // 2.2. Store processing state in metadata
      const output = StrategyProcessor.cacheProcessingState(state, object, path)
      mutations.push(...output.mutations)
      integrityEntries.push(...output.integrityEntries)
    } else {
      // EXPRESSION WAS PROCESSED PREVIOUSLY

      // 2.3. Update package information in state
      if (processingPackage && !options.ignorePackageUpdate) {
        assert(state.package.expression === processingPackage.expression, `Expression in processing state must be the same as the one in processing package`)
        state.package.environment = processingPackage.environment
        state.package.translationTable = processingPackage.translationTable
        if (state.package.fallbackEnvironment || processingPackage.fallbackEnvironment) {
          state.package.fallbackEnvironment = processingPackage.fallbackEnvironment
        }
      }

      // 2.4. Process (solve) expression
      StrategyProcessor.solve(state, options)
    }

    // 3. Listen for missing symbols
    listeners.push(...StrategyProcessor.listenForMissingSymbols(state, object, path, options))

    // 4. Register event listeners (for symbol updates)
    for (const listener of listeners) object.controller.eventEmitter.addListener(listener)

    // 5. No new mutations are generated in re-processing UNLESS the state is ready
    if (state.isReady) {
      const processedValue = state.resolved.tree.value()

      mutations.push(OVERRIDE(path, processedValue))
    }
    // 6. If there is a fallback ready, assign its value to the target path
    else if (state.fallback && state.processor.isReady(state.fallback)) {
      const processedValue = state.fallback.tree.value()

      mutations.push(OVERRIDE(path, processedValue))
    }

    return { state, mutations, integrityEntries }
  }

  /** Generator for a generic re-processing (aka only solves already processed expressions) function */
  public registerReProcessingFunction(name: GenericMutationFrame[`name`], reProcessingOptionsGenerator: Generator<StrategyProcessSymbolOptions & Omit<StrategyProcessListenOptions, `reProcessingFunction`>>): this {
    // 0. Create and register a standard mutation function
    this.registerMutationFunction(name, (object: MutableObject, mutationOptions: MutationFunctionMetadata) => {
      // 1. Target path in object's metadata (where processing state is stored) ALWAYS comes as an argument
      //      (check compiler/controller/processing :: listenForMissingSymbols for more)
      const path = mutationOptions.arguments.processingStatePath as string
      const state: StrategyProcessingState = get(object.metadata, path)

      // 2. Re-solve processing state (basically reuses the original build tree in solve loop)
      const options = reProcessingOptionsGenerator(object)
      StrategyProcessor.solve(state, options)

      // 3. Listen for missing symbols
      const listeners = StrategyProcessor.listenForMissingSymbols(state, object, path, { ...options, reProcessingFunction: { name, arguments: { ...mutationOptions.arguments, genericReProcessing: true } } })

      // 4. Register event listeners (for symbol updates)
      if (listeners.length > 0) debugger
      for (const listener of listeners) object.controller.eventEmitter.addListener(listener)

      // // DEBUG: This is just to simulate a "signature change" in re-process
      // // ====================================================
      // return [OVERRIDE(path.computed, `aaaaa`), processedValue.signature.instruction()]
      // // ====================================================

      // [PATH] It is the same as processing state path inside metadata, but inside "data"

      // 5. No new mutations are generated in re-processing UNLESS the state is ready
      if (state.isReady) {
        const processedValue = state.resolved.tree.value()

        return [OVERRIDE(path, processedValue)]
      }
      // 6. If there is a fallback ready, assign its value to the target path
      else if (state.fallback && state.processor.isReady(state.fallback)) {
        const processedValue = state.fallback.tree.value()

        return [OVERRIDE(path, processedValue)]
      }

      return []
    })

    return this
  }

  // #endregion

  // #region EVENT -> ARGUMENTS PARSING

  /** PropertyUpdated regex index to arguments */
  public static argumentProvider_PropertyUpdatedRegexIndexes(key: string = `index`): ArgumentProvider {
    return ({ eventDispatcher: event }: BareExecutionContext<PropertyUpdatedEvent>) => {
      assert(event.type === `property:updated`, `Event must be of type "property:updated"`)

      let args: AnyObject = {}

      let possibleIndexes: MaybeUndefined<number>[] = []

      const matches: PropertyReferencePatternMatchInfo[] = (event.matches ?? []) as PatternMatchInfo[] as PropertyReferencePatternMatchInfo[]
      for (const [matchIndex, match] of matches.entries()) {
        if (match.propertyMatch.type === `regex`) {
          const regexMatch = match.propertyMatch as PatternMatchInfo as RegexPatternMatchInfo
          if (regexMatch.regexResult) {
            const index = parseInt(regexMatch.regexResult[1])
            assert(!isNil(index) && !isNaN(index), `Index must be a number`)

            possibleIndexes[matchIndex] = index
          }
          //
        } else throw new Error(`Unimplemented for match of pattern "${match.propertyMatch.type}"`)
      }

      const validIndexes: number[] = uniq(possibleIndexes.filter(index => !isNil(index)) as number[])
      assert(validIndexes.length === 1, `Only one valid index must be found`)

      args[key] = validIndexes[0]

      return args
    }
  }

  // #endregion
}

export interface CommonOptions {
  integrityEntries?: GenericListener[`integrityEntries`]
  arguments?: BareExecutionContext[`arguments`]
  argumentProvider?: MaybeArray<ArgumentProvider>
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
