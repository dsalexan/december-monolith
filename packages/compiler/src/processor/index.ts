import { set, get, isNil } from "lodash"

import { Processor, Environment, ProcessedData, Simbol } from "@december/tree"
export { Processor, Environment } from "@december/tree"
export type { ProcessedData } from "@december/tree"
import { PROPERTY, PropertyReferencePattern, REFERENCE } from "@december/utils/access"
import { UnitManager } from "@december/utils/unit"

import { Signature } from "../manager/events/signature"
import type MutableObject from "../object"
import type { Mutation } from "../mutation/mutation"
import { Strategy } from "../strategy"
import assert from "assert"
import { ObjectSourceData } from "../../../tree/src2/environment/source/object"
import { Event_Listen } from "../manager/events"

export function makeProcessor(unitManager: UnitManager): Processor {
  const processor = new Processor()

  const grammar = processor.makeGrammar(unitManager)

  processor.initialize(grammar)

  return processor
}

export type PreProcessValueOptions = Parameters<Processor[`preProcess`]>[2] & Omit<ProcessingOptions, `referenceToSource`>

export function preProcessValue(value: string, path: string, options: Parameters<Processor[`preProcess`]>[2] & { unitManager: UnitManager }): ReadyPreProcessedValue | NonReadyPreProcessedValue {
  // 1. Make processor
  const processor = makeProcessor(options.unitManager)

  // 2. Pre-process value (with empty environment)
  const preProcessedValue = processor.preProcess(value, new Environment(), options)

  // 3. If value is ready, set it
  if (preProcessedValue.isReady)
    return {
      isReady: true,
      data: preProcessedValue,
      processor,
    }

  // 4. If value is not ready, listen for those references at MANAGER LEVEL
  //      i.e. "dynamic strategies" or somefin like that
  let processorSignature: Signature = null as any
  const getSignature: NonReadyPreProcessedValue[`getSignature`] = () => processorSignature

  // 4.1. Store pre-processed tree (just signature, tree itself is metadata)
  const doSignature: NonReadyPreProcessedValue[`doSignature`] = (object: MutableObject) => {
    processorSignature = new Signature(object.id, path, value)
    set(object.metadata, `processing['${path}'].processor`, processor)

    return [processorSignature.instruction()]
  }

  // 4.2 Store "baseline" missing references (i.e. those references needed, at least initially, to finish processing the value)
  //      [PRE-PROCESSING REFERENCES]
  //      NOTE: This "resets" processing.path.missingReferences, which is BY DESIGN (the event listeners removal will happen by changing the processor signature)
  const doMissingIdentifiers: NonReadyPreProcessedValue[`doMissingIdentifiers`] = (object: MutableObject, isProxiableIdentifier: IsProxiableIdentifier) => {
    const missingReferenceIdentifiers = processor.preProcessed.symbolTable.filter(symbol => isProxiableIdentifier(symbol)) // get all identifiers in the "shape" of an alias
    set(
      object.metadata,
      `processing['${path}'].missingReferences`,
      missingReferenceIdentifiers.map(({ content }) => content),
    )

    return missingReferenceIdentifiers
  }

  return {
    isReady: false,
    data: preProcessedValue,
    processor,
    getSignature,
    doSignature,
    doMissingIdentifiers,
  }
}

export interface ReadyPreProcessedValue {
  isReady: true
  data: ProcessedData
  processor: Processor
}

export interface NonReadyPreProcessedValue {
  isReady: false
  data: ProcessedData
  processor: Processor
  //
  getSignature: () => Signature
  doSignature: (object: MutableObject) => Mutation[]
  doMissingIdentifiers: (object: MutableObject, isProxiableIdentifier: IsProxiableIdentifier) => Simbol[]
}

export function processValue(rawPath: string, object: MutableObject, referenceToSource: ReferenceToSource): ReadyProcessingObject | NonReadyProcessingObject {
  // 1. Get processor from object's metadata
  const processorSignature = Signature.fromData(object.id, rawPath, object.data)
  const processor: Processor = get(object.metadata, `processing['${rawPath}'].processor`)

  assert(processor, `Tree Processor not found for "${rawPath}"`)

  // 2. Build environment
  const knownMissingReferences = get(object.metadata, `processing['${rawPath}'].missingReferences`, []) as string[]

  const environment: Environment = new Environment()
  for (const reference of knownMissingReferences) {
    const sourceData = referenceToSource(reference)

    // if reference is found
    if (sourceData) environment.addObjectSource(reference, sourceData)
  }

  // 3. Finish processing
  const processedData = processor.process(environment)

  // if value is ready, return instructions to set it
  if (processedData.isReady) {
    return {
      isReady: true,
      signature: processorSignature,
      environment,
      processor,
      data: processedData,
    }
  }

  // If value is not ready
  let missingReferenceIdentifiers: Simbol[] = null as any

  // 3. Store "processing" missing references (i.e. references that we only know are needed AFTER an initial processing step)
  //      [PROCESSING REFERENCES]
  const doMissingIdentifiers: NonReadyProcessingObject[`doMissingIdentifiers`] = (isProxiableIdentifier: IsProxiableIdentifier) => {
    missingReferenceIdentifiers = processor.preProcessed.symbolTable.filter(symbol => isProxiableIdentifier(symbol) && !knownMissingReferences.includes(symbol.content)) // get all identifiers in the "shape" of an alias
    set(
      object.metadata,
      `processing['${rawPath}'].missingReferences`, //
      [...knownMissingReferences, ...missingReferenceIdentifiers.map(({ content }) => content)],
    )

    return missingReferenceIdentifiers
  }

  // 4. Proxy update:property to missing references into compute:modes (only for new/unknown missing references — i.e. those that were not known before)
  const doProxy: NonReadyProcessingObject[`doProxy`] = (proxy, identifierSymbolToPropertyPattern, data) => {
    assert(missingReferenceIdentifiers, `Missing reference identifiers processed`)

    if (missingReferenceIdentifiers.length === 0) return
    const propertyPatterns = missingReferenceIdentifiers.map(simbol => identifierSymbolToPropertyPattern(simbol))

    proxy({ type: `update:property`, properties: propertyPatterns, data }, `compute:modes:process`).bindSignature(processorSignature)
  }

  return {
    isReady: false,
    signature: processorSignature,
    environment,
    processor,
    data: processedData,
    //
    doMissingIdentifiers,
    doProxy,
  }
}

export interface ReadyProcessingObject {
  isReady: true
  signature: Signature
  environment: Environment
  processor: Processor
  data: ProcessedData
}

export interface NonReadyProcessingObject {
  isReady: false
  signature: Signature
  environment: Environment
  processor: Processor
  data: ProcessedData
  //
  doMissingIdentifiers: (isProxiableIdentifier: IsProxiableIdentifier) => Simbol[]
  doProxy: (proxy: ReturnType<Strategy[`proxy`]>, identifierSymbolToPropertyPattern: IdentifierSymbolToPropertyPattern, data?: Event_Listen[`data`]) => void
}

export type ReferenceToSource = (referenceKey: string) => ObjectSourceData | null
export type IsProxiableIdentifier = (symbol: Simbol) => boolean
export type IdentifierSymbolToPropertyPattern = (symbol: Simbol) => PropertyReferencePattern

export interface ProcessingOptions {
  referenceToSource: ReferenceToSource
  isProxiableIdentifier: IsProxiableIdentifier
  identifierSymbolToPropertyPattern: IdentifierSymbolToPropertyPattern
}
