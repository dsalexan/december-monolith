import { set, get, isNil } from "lodash"
import assert from "assert"

import { Processor, Environment, ProcessedData, Simbol, ObjectSourceData } from "@december/tree"
import { UnitManager } from "@december/utils/unit"
import { PropertyReferencePattern } from "@december/utils/access"

import MutableObject from "../object"
import { IntegrityEntry } from "../controller/integrityRegistry"

import {
  IdentifierSymbolToPropertyPattern,
  IsProxiableIdentifier,
  listenForMissingIdentifiersGenerator,
  makeProcessor,
  NonReadyBaseProcessedReturn,
  ProcessingState,
  ProcessingSymbolsOptions,
  ProcessorOptions,
  ReadyBaseProcessedReturn,
  saveMissingIdentifiersGenerator,
} from "./base"
import { GenericListener } from "../controller/eventEmitter/listener"
import { PROPERTY_UPDATED } from "../controller/eventEmitter/event"
import { ProxyListenerOptions, Strategy } from "../controller/strategy"
import { GenericMutationFrame } from "../controller/frameRegistry"
import type ObjectController from "../controller"

export type ReferenceToSource = (referenceKey: string) => ObjectSourceData | null
export interface ProcessingEnvironmentOptions {
  referenceToSource: ReferenceToSource
}

export type ReProcessOptions = ProcessorOptions & ProcessingSymbolsOptions & ProcessingEnvironmentOptions

// RETURN
export interface ReadyReProcessedReturn extends ReadyBaseProcessedReturn {
  environment: Environment
}
export interface NonReadyReProcessedReturn extends NonReadyBaseProcessedReturn {
  environment: Environment
}

export type ReProcessedReturn = ReadyReProcessedReturn | NonReadyReProcessedReturn

/** Re-process state (usually called when some reference is resolved) */
export function reProcess(object: MutableObject, path: string, options: ReProcessOptions): ReProcessedReturn {
  // 1. Get processor from state
  const state: ProcessingState = get(object.metadata, path)
  assert(state, `We need processing state here`)

  // 2. Build environment and finish processing
  const environment = buildEnvironment(state, options)
  const processedData = state.processor.process(environment)

  // 3. If value is ready, return
  if (processedData.isReady) {
    return {
      isReady: true,
      data: processedData,
      processor: state.processor,
      environment,
    }
  }

  // 4. Store missing references keeping completion from happening
  const saveMissingIdentifiers: NonReadyReProcessedReturn[`saveMissingIdentifiers`] = saveMissingIdentifiersGenerator(state, options.isProxiableIdentifier)

  // 5. Proxy missing references events to final processing step
  const listenForMissingIdentifiers: NonReadyReProcessedReturn[`listenForMissingIdentifiers`] = listenForMissingIdentifiersGenerator(state, options.identifierSymbolToPropertyPattern)

  return {
    isReady: false,
    data: processedData,
    processor: state.processor,
    environment,
    //
    saveMissingIdentifiers,
    listenForMissingIdentifiers,
  }
}

/** Build environment (sometimes from an already existing one) for re-processing */
export function buildEnvironment(state: ProcessingState, options: ProcessorOptions & ProcessingEnvironmentOptions) {
  // 1. Get symbols from state
  const missingIdentifiers = state.missingIdentifiers

  const environment: Environment = options.environment?.clone() ?? new Environment()
  for (const symbol of missingIdentifiers) {
    const reference = symbol.value
    const sourceData = options.referenceToSource(reference)

    // if reference is found
    if (sourceData) environment.addObjectSource(reference, sourceData)
  }

  return environment
}
