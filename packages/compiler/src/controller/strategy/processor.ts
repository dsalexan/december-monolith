import assert from "assert"
import { NonNil, Nullable } from "tsdef"
import { get, isNil, isString } from "lodash"

import { Simbol, SymbolTable } from "@december/tree/symbolTable"

import { Node, Statement } from "@december/tree/tree"
import { SyntacticalContext } from "@december/tree/parser"
import { Environment, InterpreterOptions, RuntimeEvaluation, RuntimeValue } from "@december/tree/interpreter"
import Processor, { BaseProcessorRunOptions, makeDefaultProcessor, ProcessorFactoryFunction } from "@december/tree/processor"

import { PropertyReferencePattern } from "@december/utils/access"
import { UnitManager } from "@december/utils/unit"

import { IntegrityEntry } from "../integrityRegistry"
import { createListener, GenericListener, Listener } from "../eventEmitter/listener"
import MutableObject from "../../object"
import { Mutation } from "../../mutation/mutation"
import { GenericMutationFrame } from "../frameRegistry"
import { BareExecutionContext } from "../callQueue"
import { resolveTargetEvent } from "."
import { PROPERTY_UPDATED } from "../eventEmitter/event"

export type ReProcessingFunction = { name: GenericMutationFrame[`name`]; arguments: NonNil<BareExecutionContext[`arguments`]> }

export interface MutationInput {
  mutations: Mutation[]
  integrityEntries: IntegrityEntry[]
}

export interface StrategyProcessorParseOptions {
  unitManager: UnitManager
  syntacticalContext: SyntacticalContext
  //
  processorFactory?: ProcessorFactoryFunction
}

export interface StrategyProcessorResolveOptions {
  syntacticalContext: SyntacticalContext
  environmentUpdateCallback: Exclude<BaseProcessorRunOptions[`environmentUpdateCallback`], undefined>
  isValidFunctionName?: InterpreterOptions[`isValidFunctionName`]
}

export interface StrategyProcessorListenOptions {
  isSymbolListenable: (symbol: Simbol) => boolean
  generatePropertyPatterns: (symbol: Simbol) => PropertyReferencePattern[]
  reProcessingFunction: ReProcessingFunction | string
}

export class StrategyProcessor {
  constructor() {}

  /**
   * ==============================================================================
   * ==============================================================================
   *
   *              ALWAYS CALL CACHE AND LISTEN AFTER PROCESS/SOLVE
   *
   * ==============================================================================
   * ==============================================================================
   */

  // #region CORE

  /** Parse expression into an AST */
  public static parse(expression: string, options: StrategyProcessorParseOptions): StrategyProcessState {
    const symbolTable = new SymbolTable()

    // 1. Make processor instance dedicated to expression
    const factory = options.processorFactory ?? makeDefaultProcessor
    const processor = factory({ unitManager: options.unitManager, symbolTable })

    // 2. Parse expression into AST
    const AST = processor.parse(expression, { ...options })

    return new StrategyProcessState(expression, symbolTable, processor, AST)
  }

  /** Tries to resolve AST (evaluate + simplify in loop) */
  public static resolve(state: StrategyProcessState, environment: Environment, options: StrategyProcessorResolveOptions): StrategyProcessState & StrategyProcessResolvedState {
    const { symbolTable, processor, AST } = state

    const latestTree = state.evaluation ? state.evaluation.node : AST

    // 1. Try to update environment based on AST
    //      (inside here we would check all missing symbols, from symbolTable, and ATTEMPT to inject them, resolve the variable, into the ENVIRONMENT)
    options.environmentUpdateCallback(environment, symbolTable)

    // 2. Reset symbol linking
    symbolTable.resetLinks()

    // 3. Run resolution loop
    const { originalContent, content, evaluation, isReady } = processor.resolve(latestTree, environment, symbolTable, {
      ...options,
    })

    return state.resolve({ environment, evaluation })
  }

  /** Process expression into evaluation */
  public static process(expression: string, environment: Environment, options: StrategyProcessorParseOptions & StrategyProcessorResolveOptions): StrategyProcessState & StrategyProcessResolvedState {
    const state = StrategyProcessor.parse(expression, options)
    return StrategyProcessor.resolve(state, environment, options)
  }

  // #endregion

  /** Cache processing state into object's metadata */
  public static cache(state: StrategyProcessState, object: MutableObject, path: string): MutationInput {
    // 1. Check if something is already cached there
    const value = get(object.metadata, path)
    assert(isNil(value), `Something is already cached @ "${path}" for object "${object.id}"`)

    // 2. Make integrity entry
    const integrityEntries = [object.makeIntegrityEntry(path, state.expression)]
    state.integrityEntries.push(...integrityEntries)

    // 3. Store state into object's metadata
    const mutations: Mutation[] = object.storeMetadata(state, path, integrityEntries)

    return { mutations, integrityEntries }
  }

  /** Listen for all "listenable" symbols indexed in table */
  public static listenForSymbols(state: StrategyProcessState, object: MutableObject, path: string, options: StrategyProcessorListenOptions): Listener[] {
    const { symbolTable, integrityEntries, listenedSymbols } = state

    // 1. Get all symbols
    const allSymbols = symbolTable.getAllSymbols(state.environment!)

    // 2. Ignore already listened to symbols
    const notListenedSymbols = allSymbols.filter(symbol => !state.listenedSymbols[symbol.name]?.length)

    // 3. Filter only "listenable" symbols
    const listenableSymbols = notListenedSymbols.filter(symbol => options.isSymbolListenable(symbol))

    // 4. Create listeners for each symbol
    const listeners: Listener[] = []
    for (const symbol of listenableSymbols) {
      // 4.1. Generate property patterns for event
      const propertyPatterns = options.generatePropertyPatterns(symbol)

      // 4.2. Parse re-processing function name and arguments
      const name = isString(options.reProcessingFunction) ? options.reProcessingFunction : options.reProcessingFunction.name
      const args = isString(options.reProcessingFunction) ? {} : options.reProcessingFunction.arguments

      // 4.3. Crete generic listener
      const genericListener: GenericListener = {
        // handle any self references if necessary
        targetEvent: resolveTargetEvent(object, PROPERTY_UPDATED(...propertyPatterns)),
        // enqueue re-processing function on event (i.e. when any of the properties tied to symbol is updated)
        callback: (event, { eventEmitter }) => {
          eventEmitter.controller.callQueue.enqueue(object.reference(), {
            eventDispatcher: event,
            name,
            arguments: { ...args, symbol, processingStatePath: path },
          })
        },
        // if any integrity entry changes, kill this listener
        integrityEntries,
      }

      // 4.4. Complete listener
      const listener = createListener(object.id, genericListener)
      listeners.push(listener)

      // 4.5. Update state index with listener
      listenedSymbols[symbol.name] ??= []
      listenedSymbols[symbol.name].push(listener)
    }

    return listeners
  }
}

export interface StrategyProcessResolvedState {
  environment: Environment
  //
  evaluation: RuntimeEvaluation
  isReady: boolean
}

export class StrategyProcessState {
  public expression: string
  public environment: Nullable<Environment> = null
  //
  public symbolTable: SymbolTable
  public processor: Processor
  //
  public AST: Statement
  public evaluation: Nullable<RuntimeEvaluation> = null
  //
  public integrityEntries: IntegrityEntry[] = []
  public listenedSymbols: Record<Simbol[`name`], Listener[]> = {}

  constructor(expression: string, symbolTable: SymbolTable, processor: Processor, AST: Statement) {
    this.expression = expression

    this.symbolTable = symbolTable
    this.processor = processor

    this.AST = AST
  }

  /** Check if state was already resolved */
  public isResolved(): this is this & StrategyProcessResolvedState {
    return this.evaluation !== null
  }

  public resolve({ environment, evaluation }: { environment: Environment; evaluation: RuntimeEvaluation }): this & StrategyProcessResolvedState {
    this.environment = environment
    this.evaluation = evaluation

    return this as this & StrategyProcessResolvedState
  }

  /** Check if evaluation is ready */
  public isReady(): boolean {
    return this.isResolved() && this.evaluation.runtimeValue !== null
  }

  /** Get processed value */
  public getValue<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(): TRuntimeValue {
    assert(this.isReady(), `Cannot get value from unready state.`)

    return this.evaluation!.runtimeValue! as TRuntimeValue
  }
}
