import assert from "assert"
import { NonNil } from "tsdef"
import { get, isString } from "lodash"

import MutableObject from "../../object"

import { GenericMutationFrame, MutationFunctionOutput, MutationFunctionReturn } from "../frameRegistry/mutationFrame"
import { OVERRIDE } from "../../mutation"
import { Mutation } from "../../mutation/mutation"

import { preProcess, PreProcessOptions, reProcess, ReProcessOptions } from "../../processor"
import { ProcessingPackage, ProcessingPath, ReProcessingFunction } from "../../processor/base"

import type { ProxyListenerOptions } from "."
import { BareExecutionContext } from "../callQueue"
import { Environment } from "../../tree"
import { ReProcessedReturn } from "../../processor/reRrocess"
import { PreProcessedReturn } from "../../processor/preProcess"

// #region B. Process package into states and MutationFunctionReturn

export type StrategyPreProcessOptions = PreProcessOptions
export type StrategyReProcessOptions = ReProcessOptions

function isPreProcess(type: `pre-process` | `re-process`, value: ReturnType<typeof reProcess> | ReturnType<typeof preProcess>): value is ReturnType<typeof preProcess> {
  return type === `pre-process`
}

export function process(type: `pre-process`, addProxyListener: Function, processingPackage: ProcessingPackage, options: StrategyPreProcessOptions): MutationFunctionOutput & { processedValue: PreProcessedReturn }
export function process(type: `re-process`, addProxyListener: Function, processingPackage: ProcessingPackage, options: StrategyReProcessOptions): MutationFunctionOutput & { processedValue: ReProcessedReturn }
export function process(
  type: `pre-process` | `re-process`,
  addProxyListener: Function,
  processingPackage: ProcessingPackage,
  options: StrategyPreProcessOptions | StrategyReProcessOptions,
): MutationFunctionOutput & { processedValue: ReProcessedReturn | PreProcessedReturn } {
  const { object, path, reProcessingFunction, environment } = processingPackage

  // 1. Process expression
  let processedValue: ReturnType<typeof reProcess> | ReturnType<typeof preProcess>
  if (type === `pre-process`) {
    const expression = get(object.data, path.expression)
    assert(isString(expression), `Expression is not a string to be pre-processed`)

    processedValue = preProcess(processingPackage, { ...(options as StrategyPreProcessOptions) })
  } else {
    processedValue = reProcess(processingPackage, { ...(options as StrategyReProcessOptions) })
  }

  // 2. Override target path with new processed value
  if (processedValue.isReady) {
    const computedValue = processedValue.data.tree.value()

    // // DEBUG: This is just to simulate a "signature change" in re-process
    // // ====================================================
    // processedValue.signature.value = `aaaaa`
    // return [OVERRIDE(path.computed, computedValue), processedValue.signature.instruction()]
    // // ====================================================

    return { processedValue, mutations: [OVERRIDE(path.target, computedValue)], integrityEntries: [] }
  }

  // 3. Store processing state (if necessary)
  //      Processing state is saved in target while processing is not ready
  //      Pre-processing state storage ALSO creates/saves the integrity entries, so we are sure no new ones will be created in re-processing
  const state = isPreProcess(type, processedValue) ? processedValue.saveState(object, path.target) : get(object.metadata, path.target) // save state if we are pre-processing
  assert(state, `Processing state should exist here`)

  // 4. Save missing identifiers in processing state (i.e. store missing references keeping completion from happening)
  processedValue.saveMissingIdentifiers(object)

  // 5. Proxy missing references events to final processing step
  processedValue.listenForMissingIdentifiers(addProxyListener as any, object, {
    name: reProcessingFunction.name,
    arguments: { ...reProcessingFunction.arguments, path },
  })

  // 6. Only pre-processing generate changes in the object while NOT READY
  return type === `pre-process` ? { processedValue, mutations: [...state.mutations], integrityEntries: [...state.integrityEntries] } : { processedValue, mutations: [], integrityEntries: [] }
}

// #endregion
