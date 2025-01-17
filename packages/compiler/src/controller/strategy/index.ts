import assert from "assert"
import { AnyObject, MaybeArray, MaybeUndefined, Nilable, Nullable, WithOptionalKeys } from "tsdef"
import { get, isNil, isString, property, set, uniq } from "lodash"

import { Environment, SyntacticalContext } from "@december/tree"
import { Simbol } from "@december/tree/symbolTable"

import { isNilOrEmpty } from "@december/utils"
import generateUUID from "@december/utils/uuid"
import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, Reference, REFERENCE } from "@december/utils/access"
import { PropertyReferencePatternMatchInfo } from "@december/utils/access/match"
import { BasePattern, PatternMatchInfo } from "@december/utils/match/base"
import { RegexPatternMatchInfo } from "@december/utils/match/element"

import { VariableName } from "@december/tree/interpreter"

import logger, { paint } from "../../logger"
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
import { MutationFunctionMetadata, MutationFunctionOutput } from "../frameRegistry/mutationFrame"
import { MutationInput, ReProcessingFunction, StrategyProcessor, StrategyProcessorListenOptions, StrategyProcessorParseOptions, StrategyProcessorResolveOptions, StrategyProcessState } from "./processor"
import { DependencyEntry } from "../dependencyGraph"

export type Generator<TReturn> = (object: MutableObject) => TReturn
export type { MutationInput } from "./processor"

export interface ProxyListenerOptions {
  // arguments?: BareExecutionContext[`arguments`]
  hashableArguments?: BareExecutionContext[`hashableArguments`]
  otherArguments?: BareExecutionContext[`otherArguments`]
  integrityEntries?: IntegrityEntry[]
}

export interface StrategyProcessorInputOptions {
  expression?: string
  environment?: Environment
}

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
        if (options.hashableArguments) bareExecutionContext.hashableArguments = options.hashableArguments
        if (options.otherArguments) bareExecutionContext.otherArguments = options.otherArguments
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
      return (event, { listener, eventEmitter }) => {
        // debugger
        return eventEmitter.controller.callQueue.enqueue(origin.reference(), {
          eventDispatcher: event,
          name,
          hashableArguments: { ...(options.hashableArguments ?? {}) },
          otherArguments: { ...(options.otherArguments ?? {}), originReference: origin.reference() },
        })
      }
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

  /** Generic processing for an expression (which is contained inside (object, path) pair) */
  public static process(
    object: MutableObject,
    path: string,
    options: StrategyProcessorInputOptions & StrategyProcessorParseOptions & StrategyProcessorResolveOptions & StrategyProcessorListenOptions,
  ): MutationInput & { state: StrategyProcessState } {
    const mutationInput: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
    const listeners: Listener[] = []

    let skipMutation = false

    // 0. Check if expression was processed previously (i.e. if processing state exists in metadata)
    let state: StrategyProcessState = get(object.metadata, path)
    let environment: Environment = options.environment!

    const locallyUpdatedVariables: VariableName[] = []

    // 1. Process (parse + resolve) expression
    if (!state) {
      // if (options.expression === `thr`) debugger

      assert(options.expression, `Expression must be provided for new expressions`) // COMMENT
      assert(options.environment, `Environment must be provided for new expressions`) // COMMENT
      // 1.A. Process expression
      state = StrategyProcessor.process(options.expression, options.environment, locallyUpdatedVariables, options)

      // 1.B. Store state in metadata
      skipMutation = true
      const output = StrategyProcessor.cache(state, object, path)
      mutationInput.mutations.push(...output.mutations)
      mutationInput.integrityEntries.push(...output.integrityEntries)
    }
    // 2. Resolve expression (well, actually resolve processing state)
    else {
      // if (state.expression === `thr`) debugger

      environment = options.environment ?? state.environment!
      assert(environment, `Where should I find the environment then genius`)
      StrategyProcessor.resolve(state, environment, locallyUpdatedVariables, options)
    }

    // 3. Listen for new symbols
    listeners.push(...StrategyProcessor.listenForSymbols(state, object, path, options))
    for (const listener of listeners) object.controller.eventEmitter.addListener(listener)

    // 4. If processing is finished, update value in object's data
    if (state.isReady()) {
      const value = state.getValue()
      assert(!isNil(value), `Value must be resolved AND ready`)
      assert(!(value instanceof MutableObject), `Value cannot be a MutableObject, problems with circular references`)

      // force update property with the same value just to trigger listeners
      if (!skipMutation) mutationInput.mutations.push(...object.setReferenceToMetadata(path, true))
    }

    // 5. Filter symbols for dependency tracking
    const allSymbols = state.symbolTable.getAllSymbols(environment)
    const dependencyEntries = allSymbols
      .map(symbol => options.getDependencyEntry(object.id, symbol))
      .filter(entry => !isNil(entry))
      .flat() as DependencyEntry[]

    assert(state.integrityEntries.length === 1, `Club cant handle`)
    const integrityEntry = state.integrityEntries[0]
    mutationInput.dependencies.push(...dependencyEntries.map(entry => ({ ...entry, integrityEntry })))

    return { state, ...mutationInput }
  }

  /** Process multiple expressions */
  public static bulkProcess(
    object: MutableObject,
    inputs: { expression: string; path: string; environment: Environment; reProcessingFunction?: ReProcessingFunction | string }[],
    options: WithOptionalKeys<StrategyProcessorInputOptions & StrategyProcessorParseOptions & StrategyProcessorResolveOptions & StrategyProcessorListenOptions, `reProcessingFunction`>,
  ): (MutationInput & {
    state: StrategyProcessState
  })[] {
    const outputs: (MutationInput & {
      state: StrategyProcessState
    })[] = []

    for (const { expression, path, environment, reProcessingFunction } of inputs) {
      const output = Strategy.process(object, path, {
        ...options,
        //
        expression,
        environment,
        //
        syntacticalContext: { mode: `expression` },
        reProcessingFunction: reProcessingFunction ?? options.reProcessingFunction ?? `compute:re-processing`,
      })

      outputs.push(output)
    }

    return outputs
  }

  /** Generator of a generic re-processing strategy function (useful to just re-run resolution loop for already processed expressions) */
  public registerReProcessingFunction(
    name: GenericMutationFrame[`name`],
    syntacticalContext: SyntacticalContext,
    resolveOptionsGenerator: Generator<Omit<StrategyProcessorResolveOptions, `syntacticalContext`>>,
    listenOptions: Omit<StrategyProcessorListenOptions, `reProcessingFunction`>,
  ): this {
    // It is a regular mutation function at the end
    this.registerMutationFunction(name, (object: MutableObject, mutationOptions: MutationFunctionMetadata) => {
      // 1. Target path in object's metadata (where processing state is stored) ALWAYS comes as an argument
      //      (check StrategyProcessor :: listenForSymbols for more)
      const path = mutationOptions.executionContext.hashableArguments?.processingStatePath as string
      assert(isString(path) && !isNilOrEmpty(path), `Processing state path must be defined`)
      const state: StrategyProcessState = get(object.metadata, path)

      // 2. Resolve expression
      const options = resolveOptionsGenerator(object)
      const environment = state.environment!
      assert(environment, `Where should I find the environment then genius`)

      const locallyUpdatedVariables: VariableName[] = []
      StrategyProcessor.resolve(state, environment, locallyUpdatedVariables, { ...options, syntacticalContext })

      // 3. Listen for new symbols
      //      (using this very function as reProcessing target)
      const listeners = StrategyProcessor.listenForSymbols(state, object, path, {
        ...options,
        ...listenOptions,
        reProcessingFunction: {
          name, //
          hashableArguments: { ...(mutationOptions.executionContext.hashableArguments ?? {}) },
          otherArguments: { ...(mutationOptions.executionContext.otherArguments ?? {}), genericReProcessing: true },
        },
      })
      for (const listener of listeners) object.controller.eventEmitter.addListener(listener)

      // // DEBUG: This is just to simulate a "signature change" in re-process
      // // ====================================================
      // return [OVERRIDE(path.computed, `aaaaa`), processedValue.signature.instruction()]
      // // ====================================================

      // 4. If processing is finished, update value in object's data
      if (state.isReady()) {
        const value = state.getValue()
        assert(!isNil(value), `Value must be resolved`)
        assert(!(value instanceof MutableObject), `Value cannot be a MutableObject, problems with circular references`)

        // force update property with the same value just to trigger listeners
        return object.setReferenceToMetadata(path, true)
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
        } else if (match.propertyMatch.type === `equals`) {
          // pass
        } else throw new Error(`Unimplemented for match of pattern "${match.propertyMatch.type}"`)
      }

      const validIndexes: number[] = uniq(possibleIndexes.filter(index => !isNil(index)) as number[])

      if (validIndexes.length > 0) {
        assert(validIndexes.length === 1, `Only one valid index must be found`)

        args[key] = validIndexes[0]
      }

      return args
    }
  }

  // #endregion
}

// export type ReProcessingOptionsGenerator = Generator<StrategyProcessSymbolOptions & Omit<StrategyProcessListenOptions, `reProcessingFunction`>>

export interface CommonOptions {
  integrityEntries?: GenericListener[`integrityEntries`]
  hashableArguments?: BareExecutionContext[`hashableArguments`]
  otherArguments?: BareExecutionContext[`otherArguments`]
  argumentProvider?: MaybeArray<ArgumentProvider>
}

/** Resolve some generic properties inside events (like "self reference") */
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

export function mergeMutationInput(A: MutationInput, B: MutationInput): MutationInput {
  return {
    mutations: [...A.mutations, ...B.mutations],
    integrityEntries: [...A.integrityEntries, ...B.integrityEntries],
    dependencies: [...(A.dependencies ?? []), ...(B.dependencies ?? [])],
  }
}
