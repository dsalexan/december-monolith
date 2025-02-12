import assert from "assert"
import { get, isNil, isNumber } from "lodash"
import { Arguments, MaybeUndefined, Nilable, Nullable } from "tsdef"
import { OmitDeep } from "type-fest"

import { isNilOrEmpty, removeUndefinedKeys, split } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"

import { mergeMutationInput, MutableObject, MutationInput, OVERRIDE, SET, Strategy } from "@december/compiler"

import { GCAAttribute } from "@december/gca"
import { getProgressionIndex, getProgressionType, isProgression } from "@december/gca/utils/progression"

import GURPSCharacter from "../../../../character"
import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSMode, RuntimeIGURPSModifier, RuntimeIGURPSTraitDefaults } from "../runtime"
import { setupProcessing } from "../options"

export function GCAInitialize_Attribute(object: MutableObject, gca: GCAAttribute, baseTrait: RuntimeIGURPSBaseTrait<`attribute`>): MutationInput & { trait: RuntimeIGURPSAttribute } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let base: RuntimeIGURPSAttribute[`score`][`base`]
  if (isNilOrEmpty(gca.baseValue)) base = { source: `0` }
  else base = { source: gca.baseValue }

  const minimum: RuntimeIGURPSAttribute[`score`][`minimum`] = isNilOrEmpty(gca.minScore)
    ? undefined
    : {
        expression: gca.minScore,
        // value: number
      }

  const step: number = gca.step ?? 1

  let increment: RuntimeIGURPSAttribute[`cost`][`increment`]
  let decrement: RuntimeIGURPSAttribute[`cost`][`decrement`]

  if (isNilOrEmpty(gca.up)) increment = { progression: `1` }
  else if (isProgression(gca.up)) increment = { progression: gca.up }
  else increment = { expression: gca.up }

  if (isNilOrEmpty(gca.down)) decrement = { progression: `1` }
  else if (isProgression(gca.down)) decrement = { progression: gca.down }
  else decrement = { expression: gca.down }

  // 2. Build BASE_TRAIT
  const trait: OmitDeep<RuntimeIGURPSAttribute, `cost.display`> = {
    ...baseTrait,
    //
    score: {
      base,
      minimum,
    },
    level: {},
    points: {
      base: gca.basePoints,
      //
      value: gca.basePoints,
    },
    cost: {
      type: `step`,
      // display: null, // TODO: Compile display on update @ COST.INCREMENT, COST.DECREMENT, COST.STEP (because increment or decrement could be expression dependant)
      //
      increment,
      decrement,
      step,
      round: gca.round === 1 ? `up` : gca.round === -1 ? `down` : `none`,
    },
    //
    symbol: gca.symbol,
  }

  removeUndefinedKeys(trait)

  // 3. Determine what to process
  const { options, environment } = setupProcessing(object)

  const inputs: Arguments<(typeof Strategy)[`bulkProcess`]>[1] = [
    // tecnically we only process the FIRST base.source
    // if the value changes (base.source), we would not re-process it
    // it would require a re-processing function (like GCA:compute:score:base:initial or sumthing)
    // this here only re-process the same originale expression if some listener fires
    { path: `score.base.initial`, expression: trait.score.base.source, environment }, //
  ]

  if (`expression` in trait.cost.increment) {
    debugger
    inputs.push({ path: `cost.increment.value`, expression: trait.cost.increment.expression, environment, reProcessingFunction: `GCA:compute:score:increment` })
  }

  if (`expression` in trait.cost.decrement) {
    debugger
    inputs.push({ path: `cost.decrement.value`, expression: trait.cost.decrement.expression, environment, reProcessingFunction: `GCA:compute:score:decrement` })
  }

  // if (object.id === `11176`) debugger // ST:Basic Speed
  if (object.id === `11170`) debugger // ST:Basic Air Move

  // 4. Pre-process stuff (for dependency graphs)
  const processingOutputs = Strategy.bulkProcess(object, inputs, {
    ...options,
    //
    syntacticalContext: { mode: `expression` },
  })

  for (const processingOutput of processingOutputs) output = mergeMutationInput(output, processingOutput)

  return { ...output, trait: trait as RuntimeIGURPSAttribute }
}

export function GCAComputeScoreInitial(object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Get base source
  const baseSource = object.getProperty(`score.base.source`)
  assert(!isNilOrEmpty(baseSource), `Default notation must be defined`)

  // 2. Process source
  const { options, environment } = setupProcessing(object)

  // if (object.id === `11270`) debugger
  if (object.id === `11176`) debugger // ST:Basic Speed
  if (object.id === `11170`) debugger // ST:Basic Air Move

  const processingOutput = Strategy.process(object, `score.base.initial`, {
    ...options,
    //
    expression: baseSource,
    environment,
    //
    syntacticalContext: { mode: `expression` },
    reProcessingFunction: `GCA:compute:score:initial`,
  })
  const state = processingOutput.state

  output = mergeMutationInput(output, processingOutput)
  return output
}

export function GCAComputeScoreBase(object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // BASE_SCORE = INITIAL_SCORE + BOUGHT_SCORE

  // if (object.id === `11193`) debugger // ST:DX
  // if (object.id === `11226`) debugger // ST:HT
  // if (object.id === `11176`) debugger // ST:Basic Speed
  // if (object.id === `11170`) debugger // ST:Basic Air Move
  // if (object.id === `11361`) debugger // ST:Will

  // 1. Get attribute
  const attribute = object.getData()
  const basePoints = attribute.points.base
  const stepFactor = attribute.cost.step

  // 2. Get initial score
  const initialSource = get(object.data, `score.base.source`)
  const initialScoreState = get(object.metadata, `score.base.initial`)

  const initialScore = object.getProperty(`score.base.initial`)
  if (!initialScore) return output // initial score not ready, bail out

  // if (object.id === `11176`) debugger // ST:Basic Speed

  // 3. Process increment/decrement
  let steps: number = 0
  if (basePoints > 0) {
    if (`progression` in attribute.cost.increment) steps = getProgressionIndex(attribute.cost.increment.progression, basePoints, {}) + 1
    else debugger
  } else if (basePoints < 0) {
    if (`progression` in attribute.cost.decrement) steps = getProgressionIndex(attribute.cost.decrement.progression, basePoints, { reverse: true }) - 1
    else debugger
  }

  // if (object.id === `11176`) debugger // ST:Basic Speed

  // 2. Calculate bought score
  //      BOUGHT_SCORE = (BASE_POINTS / (UP, DOWN)) * STEP
  if (steps > 0) assert(stepFactor !== 0, `Step factor must not be 0`)
  const boughtScore = steps === 0 ? 0 : steps * stepFactor

  // 3. Calculate final base score
  const baseScore = initialScore.value + boughtScore
  assert(isNumber(baseScore) && !isNaN(baseScore), `Base Score value must be a number`)

  output.mutations.push(OVERRIDE(`score.base.value`, baseScore))
  return output
}

export function GCAComputeScoreValue(object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // BASE_SCORE = INITIAL_SCORE + BOUGHT_SCORE

  // if (object.id === `11193`) debugger // ST:DX
  // if (object.id === `11226`) debugger // ST:HT
  // if (object.id === `11176`) debugger // ST:Basic Speed
  // if (object.id === `11170`) debugger // ST:Basic Air Move

  // 1. Get attribute
  const attribute = object.getData()
  const baseScore = attribute.score.base.value
  assert(!isNil(baseScore), `Base score must be defined`)

  const extraScore = 0

  // 2. Calculate score value
  const score = baseScore + extraScore
  assert(isNumber(score) && !isNaN(score), `Score value must be a number`)

  const roundedScore = attribute.cost.round === `up` ? Math.ceil(score) : attribute.cost.round === `down` ? Math.floor(score) : score

  // if (object.id === `11228`) debugger
  // if (object.id === `11193`) debugger // ST:DX
  // if (object.id === `11226`) debugger // ST:HT
  // if (object.id === `11228`) debugger // ST:IQ
  // if (object.id === `11361`) debugger // ST:Will

  output.mutations.push(OVERRIDE(`score.value`, roundedScore))
  output.mutations.push(OVERRIDE(`level.value`, roundedScore))
  return output
}
