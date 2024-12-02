import { set, get, isNil, isString, omit } from "lodash"
import { AnyObject, MaybeUndefined, Nilable, NonNil, Nullable } from "tsdef"
import assert from "assert"

import uuid from "@december/utils/uuid"

import { Environment, Processor, Simbol } from "@december/tree"
import SymbolTable, { SymbolIndex, SymbolValueInvoker } from "@december/tree/environment/symbolTable"
import { ProcessingOutput, ProcessorBuildOptions } from "@december/tree/processor"

import { UnitManager } from "@december/utils/unit"
import { PropertyReferencePattern } from "@december/utils/access"

import MutableObject from "../../object"
import { IntegrityEntry } from "../integrityRegistry"
import { Mutation } from "../../mutation/mutation"
import { ProcessingSymbolTranslationTable, SymbolTranslationValue, TranslationTableValueInvoker } from "./translationTable"
import { resolveTargetEvent } from "."
import { PROPERTY_UPDATED } from "../eventEmitter/event"
import { createListener, GenericListener, Listener } from "../eventEmitter/listener"
import { GenericMutationFrame } from "../frameRegistry"
import { BareExecutionContext } from "../callQueue"

// Parsing symbol into object sourced value (i.e. ALIAS -> TRAIT and such)
export type StrategyProcessSymbolInvoker = (key: string, symbols: Nullable<Simbol[]>, symbolKey?: SymbolTranslationValue) => Nilable<AnyObject>
export type StrategyProcessSymbolOptions = { fetchReference: StrategyProcessSymbolInvoker }

// Options for full procesing (build + solve) of expressions
export type StrategyProcessBuildOptions = ProcessorBuildOptions & { unitManager: UnitManager }

// Options for listening to missing symbols
export type ReProcessingFunction = { name: GenericMutationFrame[`name`]; arguments: NonNil<BareExecutionContext[`arguments`]> }
export type SymbolListenableChecker = (symbol: Simbol) => boolean
export type PropertyPatternsGenerator = (key: Simbol[`key`], symbols: Simbol[]) => PropertyReferencePattern[]

export interface StrategyProcessListenOptions {
  reProcessingFunction: ReProcessingFunction | string
  canListenToSymbol: SymbolListenableChecker
  generatePropertyPatterns: PropertyPatternsGenerator
}

// Interfaces for processing data
export interface StrategyProcessingPackage {
  expression: string
  translationTable: ProcessingSymbolTranslationTable
  environment: Environment
  fallbackEnvironment?: Environment
}

export interface StrategyProcessingState {
  package: StrategyProcessingPackage
  processor: Processor
  //
  isReady: boolean
  //
  symbolTable: SymbolTable
  built: ProcessingOutput // expression -> Semantic Tree
  resolved: ProcessingOutput // Semantic Tree -> Resolved Tree
  fallback: MaybeUndefined<ProcessingOutput> // Semantic Tree -> Resolved Tree (with fallback environment)
  // this environments are just used to determined missing symbols for listening
  resolvedEnvironment: Environment
  fallbackEnvironment: MaybeUndefined<Environment>
  //
  integrityEntries: IntegrityEntry[]
  listenedSymbols: Record<Simbol[`key`], Listener[]>
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

  /** Process an expression */
  public static process(processingPackage: StrategyProcessingPackage, { fetchReference, unitManager, ...options }: StrategyProcessBuildOptions & StrategyProcessSymbolOptions): StrategyProcessingState {
    const { expression, environment: baseEnvironment, translationTable, fallbackEnvironment: baseFallbackEnvironment } = processingPackage

    let symbolTable: SymbolTable // CENTRALIZED CONTROL FOR ALL SYMBOLS RELATED TO EXPRESSION

    // 1. Make processor instance dedicated to expression
    const processor = new Processor()
    const grammar = processor.makeGrammar(unitManager)
    processor.initialize(grammar)

    // 2. Build tree from expression (i.e. expression -> Semantic Tree)
    let buildOutput = processor.build(expression, options)
    symbolTable = buildOutput.symbolTable
    if (processor.isReady(buildOutput)) debugger // bail out if ready

    // 3. Setup environment with translation table and symbols from centralized control
    let environment = baseEnvironment.clone()
    translationTable.injectIntoEnvironment(environment, (translation, symbolKey) => fetchReference(translation, null, symbolKey))
    symbolTable.injectMissingSymbolsIntoEnvironment(environment, (key, symbols) => fetchReference(key, symbols))

    // 4. Loop tree resolution until no new symbols are added to environment
    let output: ProcessingOutput = processor.solveLoop(buildOutput, symbolTable, environment, (key, symbols) => fetchReference(key, symbols))
    if (processor.isReady(output)) debugger // bail out if ready

    // 5. Loop tree resolution with default/fallback environment (changes are not cached/stored/propagated)
    let fallbackOutput: MaybeUndefined<ProcessingOutput> = undefined
    let fallbackEnvironment: MaybeUndefined<Environment> = undefined
    if (baseFallbackEnvironment) {
      fallbackEnvironment = environment.merge(baseFallbackEnvironment) // merge fallback environment into current environment
      fallbackOutput = processor.solveLoop(output, symbolTable, fallbackEnvironment, (key, symbols) => fetchReference(key, symbols))
    }

    // [SYMBOL TABLE] By here the table is filled with all symbols through all versions of the expression tree through all reductions (both from resolved and fallback)

    return {
      package: processingPackage,
      processor,
      //
      isReady: processor.isReady(output),
      //
      symbolTable,
      built: omit(buildOutput, `symbolTable`), // remove symbol table from output
      resolved: output,
      fallback: fallbackOutput,
      //
      resolvedEnvironment: environment,
      fallbackEnvironment,
      //
      integrityEntries: [],
      listenedSymbols: {},
    }
  }

  /** Cache processing state in object's metadata */
  public static cacheProcessingState(state: StrategyProcessingState, object: MutableObject, path: string): { mutations: Mutation[]; integrityEntries: IntegrityEntry[] } {
    // 0. Check if somethign is already cached there
    const value = get(object.metadata, path)
    assert(isNil(value), `Something is already cached in object's metadata (at ${path})`)

    // 1. Make integrity entry (it is registered when shipping mutations)
    const integrityEntries = [object.makeIntegrityEntry(path, state.built.expression)]
    state.integrityEntries.push(...integrityEntries)

    // 2. Store state in object's metadata
    const mutations: Mutation[] = object.storeMetadata(state, path, integrityEntries)

    return { mutations, integrityEntries }
  }

  /** Listen for missing symbols in centralized controller */
  public static listenForMissingSymbols(
    { symbolTable, resolvedEnvironment, listenedSymbols, package: { translationTable }, integrityEntries }: StrategyProcessingState,
    object: MutableObject,
    path: string, //
    { reProcessingFunction, canListenToSymbol, generatePropertyPatterns }: StrategyProcessListenOptions,
  ): Listener[] {
    // 1. Get all missing symbols in both main and fallback contexts
    const missingSymbols: Simbol[] = [...symbolTable.getMissingSymbols(resolvedEnvironment)]

    // 2. Get all missing symbols that are not already being listened to
    const notListenedSymbolsIndex: Record<Simbol[`key`], Simbol[]> = {}
    for (const symbol of missingSymbols) {
      const key = symbol.key

      // check if symbol is already being listened to
      const isAlreadyListened = listenedSymbols[key] && listenedSymbols[key].length > 0
      if (isAlreadyListened) continue

      // if not, add to list of not listened symbols
      notListenedSymbolsIndex[key] ??= []
      notListenedSymbolsIndex[key].push(symbol)
    }

    // 3. Get listenable symbols
    const listenableSymbols = Object.entries(notListenedSymbolsIndex)
      .filter(([key, symbols]) => {
        const hasTranslationKey = symbols.some(symbol => translationTable.has(symbol))
        const isListenable = symbols.some(symbol => canListenToSymbol(symbol))

        return hasTranslationKey || isListenable
      })
      .map(([key, symbols]) => ({ key, symbols }))

    // 4. Create listeners for each symbol key
    const listeners: Listener[] = []
    for (const { key, symbols } of listenableSymbols) {
      // 4.1. Get property patterns for event
      const propertyPatterns = generatePropertyPatterns(key, symbols)

      // 4.2. Parse re-processing function name and arguments
      const name = isString(reProcessingFunction) ? reProcessingFunction : reProcessingFunction.name
      const args = isString(reProcessingFunction) ? {} : reProcessingFunction.arguments

      // 4.3. Prepare package for delayed listener creation
      const genericListener: GenericListener = {
        // handle self properties (should be any here, thou)
        targetEvent: resolveTargetEvent(object, PROPERTY_UPDATED(...propertyPatterns)),
        // enqueue re-processing function on event (i.e. when any of the properties tied to symbol is updated)
        callback: (event, { eventEmitter }) => {
          eventEmitter.controller.callQueue.enqueue(object.reference(), {
            eventDispatcher: event,
            name,
            arguments: { ...args, symbols, processingStatePath: path },
          })
        },
        // if any integrity entry changes, kill this listener
        integrityEntries,
      }

      // 4.4. Return full listener
      const listener = createListener(object.id, genericListener)
      listeners.push(listener)

      // 4.5. Update state index with listener
      listenedSymbols[key] ??= []
      listenedSymbols[key].push(listener)
    }

    return listeners
  }

  /** Tries to solve a expression from its built processed state (usually called when a expression was already processed before) */
  public static solve(state: StrategyProcessingState, options: StrategyProcessSymbolOptions) {
    const {
      processor,
      symbolTable,
      built,
      package: { translationTable, environment: baseEnvironment, fallbackEnvironment: baseFallbackEnvironment },
    } = state

    // Previous outputs are ignored in favor of a fresh processing from built tree

    // 1. Setup environment with translation table and symbols from centralized control
    let environment = baseEnvironment.clone()
    translationTable.injectIntoEnvironment(baseEnvironment, (translation, symbolKey) => options.fetchReference(translation, null, symbolKey))
    symbolTable.injectIntoEnvironment(environment, (key, symbols) => options.fetchReference(key, symbols))

    // 2. Loop tree resolution with environment
    const output = processor.solveLoop(built, symbolTable, environment, (key, symbols) => options.fetchReference(key, symbols))

    // 3. Loop tree resolution with default/fallback environment (changes are not cached/stored/propagated) IF NEEDED
    let fallbackOutput: MaybeUndefined<ProcessingOutput> = undefined
    let fallbackEnvironment: MaybeUndefined<Environment> = undefined
    if (!processor.isReady(output) && baseFallbackEnvironment) {
      fallbackEnvironment = environment.merge(baseFallbackEnvironment) // merge fallback environment into current environment
      fallbackOutput = processor.solveLoop(output, symbolTable, fallbackEnvironment, (key, symbols) => options.fetchReference(key, symbols))
    }

    // 4. Update state
    state.isReady = processor.isReady(output)
    state.resolved = output
    state.fallback = fallbackOutput
    state.resolvedEnvironment = environment
    state.fallbackEnvironment = fallbackEnvironment
  }
}
