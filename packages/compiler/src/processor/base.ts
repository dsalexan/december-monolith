import { set, get, isNil } from "lodash"
import assert from "assert"

import { Processor, Environment, ProcessedData, Simbol, ObjectSourceData } from "@december/tree"
import { UnitManager } from "@december/utils/unit"
import { PropertyReferencePattern } from "@december/utils/access"
import MutableObject from "../object"
import type { ProxyListenerOptions, Strategy } from "../controller/strategy"
import { GenericMutationFrame } from "../controller/frameRegistry"
import { IntegrityEntry } from "../controller/integrityRegistry"
import { PROPERTY_UPDATED } from "../controller/eventEmitter/event"

export interface ProcessorOptions {
  unitManager: UnitManager
  environment?: Environment
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
export type IdentifierSymbolToPropertyPattern = (symbol: Simbol) => PropertyReferencePattern

export interface ProcessingSymbolsOptions {
  isProxiableIdentifier: IsProxiableIdentifier
  identifierSymbolToPropertyPattern: IdentifierSymbolToPropertyPattern
}

// READY PROCESSING
export interface ReadyBaseProcessedReturn {
  isReady: true
  processor: Processor
  data: ProcessedData
}

// NON-READY PROCESSING
export interface NonReadyBaseProcessedReturn {
  isReady: false
  processor: Processor
  data: ProcessedData
  //
  saveMissingIdentifiers: (object: MutableObject) => void
  listenForMissingIdentifiers: (addProxyListener: typeof Strategy.addProxyListener, origin: MutableObject, name?: GenericMutationFrame[`name`], args?: ProxyListenerOptions[`arguments`]) => void
}

// STATE
export interface ProcessingState {
  processor: Processor
  environment: Environment
  integrityEntries: IntegrityEntry[]
  //
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

    // 1. get all identifiers in the "shape" of an alias
    const allMissingIdentifiers = processor.preProcessed.symbolTable.filter(symbol => isProxiableIdentifier(symbol))

    const missingIdentifiers: Simbol[] = []
    // 2. Filter only symbols not tracked already
    for (const symbol of allMissingIdentifiers) {
      // TODO: Create some sort of ID for symbols
      // NOTE: What to do when a symbol is being listened to, but stops existing? Well, this only gonna happen when the original expression changes. And that triggers an integrity entry change, which would kill the whole processing state

      const byContent = allMissingIdentifiers.filter(s => s.content === symbol.content)
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
  (addProxyListener: typeof Strategy.addProxyListener, origin: MutableObject, name?: GenericMutationFrame[`name`], args?: ProxyListenerOptions[`arguments`]) => {
    // 1. Get symbols from state
    const allMissingIdentifiers = state.missingIdentifiers
    if (allMissingIdentifiers.length === 0) return

    // 2. Filter only symbols WITHOUT a listener already
    const missingIdentifiers: Simbol[] = allMissingIdentifiers.filter(symbol => !state.listenedMissingIdentifiers.includes(symbol.content))
    const propertyPatterns = missingIdentifiers.map(simbol => identifierSymbolToPropertyPattern(simbol))

    // 3. Create proxy listener
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
