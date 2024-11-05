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
  ProcessingPackage,
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
export function reProcess(processingPackage: ProcessingPackage, options: ReProcessOptions): ReProcessedReturn {
  const { object, path, environment } = processingPackage

  // 1. Get processor from state
  const state: ProcessingState = get(object.metadata, path.target)
  assert(state, `Processing state should be stored in object metadata for re-processing`)

  // 2. Build environment and finish processing
  const processedData = state.processor.process(environment)

  // 3. If value is ready, return
  if (processedData.isReady) {
    state.isReady = true

    return {
      isReady: true,
      data: processedData,
      processor: state.processor,
      environment,
    }
  }

  state.isReady = false

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
