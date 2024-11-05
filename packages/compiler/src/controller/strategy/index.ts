import assert from "assert"
import { AnyObject, MaybeArray, MaybeUndefined, Nilable, Nullable } from "tsdef"
import { get, isNil, isString, property, set, uniq } from "lodash"

import { Simbol } from "@december/tree"
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
import { ProcessingPackage, ProcessingPath, ProcessingState, ProcessingSymbolTranslationTable } from "../../processor/base"
import { Environment } from "../../tree"
import { process, StrategyPreProcessOptions, StrategyReProcessOptions } from "./processing"
import { MutationFunctionMetadata, MutationFunctionOutput } from "../frameRegistry/mutationFrame"
import logger, { paint } from "../../logger"
import { PreProcessedReturn } from "../../processor/preProcess"
import { ReProcessedReturn } from "../../processor/reRrocess"

export type { StrategyPreProcessOptions, StrategyReProcessOptions } from "./processing"

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

  public static preProcess(processingPackage: ProcessingPackage, options: StrategyPreProcessOptions) {
    return process(`pre-process`, Strategy.addProxyListener, processingPackage, options)
  }

  public static reProcess(processingPackage: ProcessingPackage, options: StrategyReProcessOptions) {
    return process(`re-process`, Strategy.addProxyListener, processingPackage, options)
  }

  public static process(pkg: ProcessingPackage, options: StrategyReProcessOptions & StrategyPreProcessOptions) {
    const { object, path } = pkg

    const state: ProcessingState = get(object.metadata, path.target)

    let output: MutationFunctionOutput & { processedValue: PreProcessedReturn | ReProcessedReturn } = null as any

    const doPreProcess = !!state
    let doReProcess = true

    // 1. if state doesn't exist, pre-process
    if (doPreProcess) {
      const { mutations, integrityEntries, processedValue } = Strategy.preProcess(pkg, options)

      output = { mutations: [...mutations], integrityEntries: [...integrityEntries], processedValue }
      if (processedValue.isReady) doReProcess = false
    }

    // 2. if processing is NOT ready following pre-processing (OR if state already exists), re-process
    if (doReProcess) {
      const { mutations, integrityEntries, processedValue } = Strategy.reProcess(pkg, options)

      output = { mutations: [...(output?.mutations ?? []), ...mutations], integrityEntries: [...(output?.integrityEntries ?? []), ...integrityEntries], processedValue }
    }

    assert(output !== null, `Output must be defined`)
    return output
  }

  // Inject specific missing references in base environment
  public static injectMissingReferences(
    object: MutableObject,
    missingIdentifiers: Simbol[],
    translationTable: ProcessingSymbolTranslationTable,
    baseEnvironment: Environment,
    fetchReference: (identifier: string, key: string) => Nilable<AnyObject>,
  ): Environment | false {
    const localSource: AnyObject = {}

    // 1. For each missing identifier, try to fetch value into local source
    for (const missingIdentifier of missingIdentifiers) {
      const identifier = missingIdentifier.content
      const proxiedKey = translationTable.get(missingIdentifier) ?? missingIdentifier.value

      /**
       * fetchReference -> returns value for reference
       *    null -> reference not found
       *    undefined -> fetch scenario not implemented
       *    value -> reference found
       */
      const referencedValue = fetchReference(identifier, proxiedKey)
      assert(referencedValue !== undefined, `Fetch for reference "${identifier}/${proxiedKey}" not implemented`)

      if (referencedValue === null) {
        logger.add(` `.repeat(10))
        logger
          .add(paint.grey.dim(`[${object.id}/`), paint.grey(object.data.name), paint.grey.dim(`]`))
          .add(` `, paint.white(identifier))
          .add(paint.grey.dim(` -> `), paint.grey.dim.bold(proxiedKey))
        logger.debug()
      }

      localSource[identifier] = referencedValue
    }

    // 2. If any new value was fetched, inject into local source
    if (Object.entries(localSource).length > 0) {
      const environment = baseEnvironment.clone()
      environment.addObjectSource(`local_${generateUUID().substring(0, 8)}`, localSource)

      return environment
    }

    // 3. If nothing new was fetched, return false
    return false
  }

  public registerReProcessingFunction(name: GenericMutationFrame[`name`], optionsGenerator: Generator<StrategyReProcessOptions>): this {
    this.registerMutationFunction(name, (object: MutableObject, mutationOptions: MutationFunctionMetadata) => {
      const { path } = mutationOptions.arguments as { path: ProcessingPath }
      assert(!isNil(path), `Path for processing (raw and computed) was not specified`)

      // 1. Generate options with contextualized object
      const options: StrategyReProcessOptions = optionsGenerator(object)

      // 2. Assemble package from context
      const translationTable: ProcessingSymbolTranslationTable = new ProcessingSymbolTranslationTable({})
      const processingPackage = new ProcessingPackage(object, path.expression, path.target, { name, arguments: { ...mutationOptions.arguments } }, null as any, null as any)

      // 3. Pre-process expression from path (or re-process state from path)
      return Strategy.reProcess(processingPackage, options)
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
