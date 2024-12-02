import { set, get, isNil } from "lodash"
import assert from "assert"

import { Processor, Environment, ProcessedData, Simbol, ObjectSourceData } from "@december/tree"
import { UnitManager } from "@december/utils/unit"
import { PropertyReferencePattern } from "@december/utils/access"

import MutableObject from "../object"
import { IntegrityEntry } from "../controller/integrityRegistry"

import { listenForSymbolsGenerator, makeProcessor, NonReadyBaseProcessedReturn, ProcessingPackage, ProcessingState, ProcessingSymbolsOptions, ProcessorOptions, ReadyBaseProcessedReturn } from "./base"
import { GenericListener } from "../controller/eventEmitter/listener"
import { PROPERTY_UPDATED } from "../controller/eventEmitter/event"
import { ProxyListenerOptions, Strategy } from "../controller/strategy"
import { GenericMutationFrame } from "../controller/frameRegistry"
import type ObjectController from "../controller"

export type ReferenceToSource = (referenceKey: string) => ObjectSourceData | null
export interface ProcessingEnvironmentOptions {
  // referenceToSource: ReferenceToSource
}

export type DisposableProcessOptions = ProcessorOptions & ProcessingSymbolsOptions & ProcessingEnvironmentOptions

// RETURN
export interface ReadyDisposableProcessedReturn extends ReadyBaseProcessedReturn {
  environment: Environment
}
export interface NonReadyDisposableProcessedReturn extends NonReadyBaseProcessedReturn {
  environment: Environment
}

export type DisposableProcessedReturn = ReadyDisposableProcessedReturn | NonReadyDisposableProcessedReturn

/** TODO: wtf is this? */
export function reProcess(processingPackage: ProcessingPackage, options: DisposableProcessOptions): DisposableProcessedReturn {
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

  // 5. Store symbols relevant to processing
  const listenForSymbols = listenForSymbolsGenerator(state, options)

  return {
    isReady: false,
    data: processedData,
    processor: state.processor,
    environment,
    //
    listenForSymbols,
  }
}
