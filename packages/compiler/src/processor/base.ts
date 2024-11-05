import { set, get, isNil, isString, cloneDeep } from "lodash"
import assert from "assert"

import { Processor, Environment, ProcessedData, Simbol, ObjectSourceData } from "@december/tree"
import { UnitManager } from "@december/utils/unit"
import { PropertyReferencePattern } from "@december/utils/access"
import MutableObject from "../object"
import type { ProxyListenerOptions, Strategy } from "../controller/strategy"
import { GenericMutationFrame } from "../controller/frameRegistry"
import { IntegrityEntry } from "../controller/integrityRegistry"
import { PROPERTY_UPDATED } from "../controller/eventEmitter/event"
import { BareExecutionContext } from "../controller/callQueue"
import { MaybeUndefined, NonNil } from "tsdef"

export interface ProcessorOptions {
  unitManager: UnitManager
}

/** Creates a new Processor instance */
export function makeProcessor(options: ProcessorOptions): Processor {
  const processor = new Processor()

  const grammar = processor.makeGrammar(options.unitManager)

  processor.initialize(grammar)

  return processor
}

// PROCESSING THINGS
export type IsProxiableIdentifier = (symbol: Simbol) => boolean
export type IdentifierSymbolToPropertyPattern = (symbol: Simbol, translationTable: ProcessingSymbolTranslationTable) => PropertyReferencePattern

export interface ProcessingSymbolsOptions {
  isProxiableIdentifier: IsProxiableIdentifier
  identifierSymbolToPropertyPattern: IdentifierSymbolToPropertyPattern
}

// Basically converts a symbol to something proxiable
export type SymbolTranslationValue = string

export class ProcessingSymbolTranslationTable {
  table: Record<string, SymbolTranslationValue>
  fns: ((symbol: Simbol) => SymbolTranslationValue)[] = []

  constructor(table: Record<string, SymbolTranslationValue> = {}) {
    this.table = {}
    for (const [key, value] of Object.entries(table)) this.set(key, value)
  }

  public set(key: string, value: SymbolTranslationValue): this {
    assert(!isNil(value), `Symbol translation value cannot be nil`)

    this.table[key] = value

    return this
  }

  public add(fn: (symbol: Simbol) => SymbolTranslationValue): this {
    this.fns.push(fn)

    return this
  }

  public has(symbol: Simbol): boolean {
    return !isNil(this.table[symbol.content]) || this.fns.some(fn => !isNil(fn(symbol)))
  }

  public get(symbol: Simbol): MaybeUndefined<SymbolTranslationValue> {
    const values: SymbolTranslationValue[] = []

    const fromTable = this.table[symbol.content]
    if (!isNil(fromTable)) values.push(fromTable)

    for (const fn of this.fns) {
      const fromFunction = fn(symbol)
      if (!isNil(fromFunction)) values.push(fromFunction)
    }

    assert(values.length <= 1, `Symbol ${symbol.content} has more than one translation`)

    return values[0]
  }
}

export class ProcessingPackage {
  object: MutableObject
  path: ProcessingPath
  reProcessingFunction: ReProcessingFunction
  environment: Environment
  translationTable: ProcessingSymbolTranslationTable

  constructor(object: MutableObject, expressionPath: string, targetPath: string, reProcessingFunction: ReProcessingFunction | string, environment: Environment, translationTable: ProcessingSymbolTranslationTable) {
    const name = isString(reProcessingFunction) ? reProcessingFunction : reProcessingFunction.name
    const args = isString(reProcessingFunction) ? {} : reProcessingFunction.arguments

    this.object = object
    this.path = { expression: expressionPath, target: targetPath }
    this.reProcessingFunction = { name, arguments: args }
    this.environment = environment
    this.translationTable = translationTable
  }

  public clone(): ProcessingPackage {
    return new ProcessingPackage(this.object, this.path.expression, this.path.target, { name: this.reProcessingFunction.name, arguments: this.reProcessingFunction.arguments }, this.environment, this.translationTable)
  }

  public setPath(expressionPath: string, targetPath: string): ProcessingPackage {
    const pkg = this.clone()
    pkg.path.expression = expressionPath
    pkg.path.target = targetPath

    return pkg
  }

  public setEnvironment(environment: Environment) {
    const pkg = this.clone()
    pkg.environment = environment

    return pkg
  }

  public setTranslationTable(translationTable: ProcessingSymbolTranslationTable) {
    const pkg = this.clone()
    pkg.translationTable = translationTable

    return pkg
  }
}

// READY PROCESSING
export interface ReadyBaseProcessedReturn {
  isReady: true
  processor: Processor
  data: ProcessedData
}

// NON-READY PROCESSING

export type ReProcessingFunction = {
  name: GenericMutationFrame[`name`]
  arguments: NonNil<BareExecutionContext[`arguments`]>
}

export interface NonReadyBaseProcessedReturn {
  isReady: false
  processor: Processor
  data: ProcessedData
  //
  saveMissingIdentifiers: (object: MutableObject) => void
  listenForMissingIdentifiers: (addProxyListener: typeof Strategy.addProxyListener, origin: MutableObject, reProcessingFunction?: ReProcessingFunction) => void
}

// STATE
export interface ProcessingPath {
  expression: string
  target: string
}

export interface ProcessingState {
  id: string
  package: ProcessingPackage
  processor: Processor
  integrityEntries: IntegrityEntry[]
  //
  isReady: boolean
  missingIdentifiers: Simbol[]
  listenedMissingIdentifiers: string[]
}

/** Function to save missing identifiers in processing state (i.e. store missing references keeping completion from happening) */
export const saveMissingIdentifiersGenerator: (state: ProcessingState, isProxiableIdentifier: IsProxiableIdentifier) => NonReadyBaseProcessedReturn[`saveMissingIdentifiers`] =
  (
    state: ProcessingState,
    isProxiableIdentifier: IsProxiableIdentifier, //
  ) =>
  (object: MutableObject) => {
    const processor = state.processor

    // 1. get all identifiers that are proxiable (i.e. can be listened to by the object controller)
    const allMissingIdentifiers = processor.preProcessed.symbolTable.filter(symbol => state.package.translationTable.has(symbol) || isProxiableIdentifier(symbol))

    const missingIdentifiers: Simbol[] = []
    // 2. Filter only symbols not tracked already
    for (const symbol of allMissingIdentifiers) {
      // TODO: Create some sort of ID for symbols
      // NOTE: What to do when a symbol is being listened to, but stops existing? Well, this only gonna happen when the original expression changes. And that triggers an integrity entry change, which would kill the whole processing state

      const byContent = state.missingIdentifiers.filter(s => s.content === symbol.content)
      const byNode = byContent.filter(s => s.node.id === symbol.node.id)

      if (byNode.length === 0) missingIdentifiers.push(symbol)
    }

    state.missingIdentifiers.push(...missingIdentifiers)
  }

/** Function to Proxy missing references events to final processing step */
export const listenForMissingIdentifiersGenerator: (state: ProcessingState, identifierSymbolToPropertyPattern: IdentifierSymbolToPropertyPattern) => NonReadyBaseProcessedReturn[`listenForMissingIdentifiers`] =
  (
    state: ProcessingState,
    identifierSymbolToPropertyPattern: IdentifierSymbolToPropertyPattern, //
  ) =>
  (addProxyListener: typeof Strategy.addProxyListener, origin: MutableObject, reProcessingFunction: ReProcessingFunction | string = `compute:re-processing`) => {
    // 1. Get symbols from state
    const allMissingIdentifiers = state.missingIdentifiers
    if (allMissingIdentifiers.length === 0) return

    // 2. Filter only symbols WITHOUT a listener already
    const missingIdentifiers: Simbol[] = allMissingIdentifiers.filter(symbol => !state.listenedMissingIdentifiers.includes(symbol.content))
    const propertyPatterns = missingIdentifiers.map(simbol => identifierSymbolToPropertyPattern(simbol, state.package.translationTable))

    // 3. Create proxy listener
    const name = isString(reProcessingFunction) ? reProcessingFunction : reProcessingFunction.name
    const args = isString(reProcessingFunction) ? {} : reProcessingFunction.arguments

    addProxyListener(
      PROPERTY_UPDATED(...propertyPatterns), //
      name ?? `compute:processing`,
      {
        arguments: { ...args, state },
        integrityEntries: state.integrityEntries,
      },
    )(origin)

    // 4. Update state
    state.listenedMissingIdentifiers.push(...missingIdentifiers.map(symbol => symbol.content))
  }
