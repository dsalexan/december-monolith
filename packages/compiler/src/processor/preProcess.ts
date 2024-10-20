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
import { Mutation } from "../mutation/mutation"

export type ProcessorPreProcessOptions = Parameters<Processor[`preProcess`]>[2]
export type PreProcessOptions = ProcessorOptions & ProcessorPreProcessOptions & ProcessingSymbolsOptions

// RETURN
export interface ReadyPreProcessedReturn extends ReadyBaseProcessedReturn {}
export interface NonReadyPreProcessedReturn extends NonReadyBaseProcessedReturn {
  saveState: (object: MutableObject, targetPath: string) => { state: ProcessingState; mutations: Mutation[]; integrityEntries: IntegrityEntry[] }
}

export type PreProcessedReturn = ReadyPreProcessedReturn | NonReadyPreProcessedReturn

/** Do pre-processing steps to resolve an expression */
export function preProcess(expression: string, options: PreProcessOptions): PreProcessedReturn {
  // 1. Pre-process value (with empty environment)
  const processor = makeProcessor(options)
  const environment: Environment = options.environment?.clone() ?? new Environment()
  const preProcessed = processor.preProcess(expression, environment, options)

  // 2. If value is ready, return
  if (preProcessed.isReady) {
    return {
      isReady: true,
      data: preProcessed,
      processor,
    }
  }

  const state: ProcessingState = {
    processor,
    environment,
    integrityEntries: [],
    //
    missingIdentifiers: [],
    listenedMissingIdentifiers: [],
  }

  // 3. Store processor state in metadata (and make integrity entry)
  const saveState: NonReadyPreProcessedReturn[`saveState`] = (object: MutableObject, targetPath: string) => {
    // 3.1. Make integrity entry (it is registered when shipping mutations)
    const integrityEntries = [object.makeIntegrityEntry(targetPath, expression)]

    // 3.2. Store state in metadata
    const mutations: Mutation[] = object.storeMetadata(state, targetPath, integrityEntries)

    return { state, mutations, integrityEntries }
  }

  // 4. Store missing references keeping completion from happening
  const saveMissingIdentifiers: NonReadyPreProcessedReturn[`saveMissingIdentifiers`] = saveMissingIdentifiersGenerator(state, options.isProxiableIdentifier)

  // 5. Proxy missing references events to final processing step
  const listenForMissingIdentifiers: NonReadyPreProcessedReturn[`listenForMissingIdentifiers`] = listenForMissingIdentifiersGenerator(state, options.identifierSymbolToPropertyPattern)

  return {
    isReady: false,
    data: preProcessed,
    processor,
    //
    saveState,
    saveMissingIdentifiers,
    listenForMissingIdentifiers,
  }
}
