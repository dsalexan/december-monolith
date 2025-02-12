import assert from "assert"
import { isNil, isNumber } from "lodash"
import { Arguments, MaybeUndefined, Nilable, Nullable } from "tsdef"
import { OmitDeep } from "type-fest"

import { isNilOrEmpty, removeUndefinedKeys, split } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"
import { PROPERTY, REFERENCE } from "@december/utils/access"

import { mergeMutationInput, MutableObject, MutationInput, OVERRIDE, SET, Strategy } from "@december/compiler"
import { PROPERTY_UPDATED } from "@december/compiler/controller/eventEmitter/event"

import { IGURPSGeneralTrait, IGURPSSkillOrSpellOrTechnique } from "@december/gurps/trait"

import { GCAAttribute, GCAGeneralTrait, GCASkillOrSpell } from "@december/gca"
import { getProgressionStep, getProgressionType, isProgression } from "@december/gca/utils/progression"

import GURPSCharacter from "../../../../character"
import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSGeneralTrait, RuntimeIGURPSMode, RuntimeIGURPSModifier, RuntimeIGURPSSkillOrSpellOrTechnique, RuntimeIGURPSTraitDefaults } from "../runtime"
import { setupProcessing } from "../options"
import { parseTraitDefaults } from "./base"

export function GCAInitialize_GeneralTrait(object: MutableObject, gca: GCAGeneralTrait, baseTrait: RuntimeIGURPSBaseTrait<IGURPSGeneralTrait[`type`]>): MutationInput & { trait: RuntimeIGURPSGeneralTrait } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let levelNames: MaybeUndefined<string[]> = undefined
  if (!isNilOrEmpty(gca.levelNames)) levelNames = split(gca.levelNames)

  assert(!isNil(gca.baseLevel), `Missing baselevl`)
  if (baseTrait.childProfile === `regular`) assert(!isNilOrEmpty(gca.cost), `Missing cost`)

  if (gca.formula) debugger // TODO: Implement formula cost

  // 2. Build BASE_TRAIT
  const trait: RuntimeIGURPSGeneralTrait = {
    ...baseTrait,
    //
    level: {
      names: levelNames,
      base: gca.baseLevel,
      value: gca.baseLevel, // TODO: Calculate this from bonus level
    },
    points: {},
    cost: {
      type: `level`,
      display: null as any, // TODO: DO THIS
      //
      progression: baseTrait.childProfile === `regular` ? gca.cost! : null,
      expression: null,
    },
  }

  removeUndefinedKeys(trait)

  // 3. Determine what to process
  const { options, environment } = setupProcessing(object)

  const inputs: Arguments<(typeof Strategy)[`bulkProcess`]>[1] = []

  // if (object.id === `12975`) debugger // AD:Flight
  if (object.id === `13094`) debugger // AD:Talent (Breathing Techniques)

  // 4. Pre-process stuff (for dependency graphs)
  if (inputs.length > 0) {
    const processingOutputs = Strategy.bulkProcess(object, inputs, {
      ...options,
      //
      syntacticalContext: { mode: `expression` },
    })

    for (const processingOutput of processingOutputs) output = mergeMutationInput(output, processingOutput)
  }

  return { ...output, trait: trait as RuntimeIGURPSGeneralTrait }
}

export function GCAComputePointsFull(object: MutableObject<RuntimeIGURPSGeneralTrait, GURPSCharacter>): MutationInput {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
  if ([`skill`, `spell`, `technique`].includes(object.data.type)) return output
  if (object.getProperty(`childProfile`) !== `regular`) return output

  // if (object.id === `15064`) debugger // SK:First Aid

  // TODO: Make sure this does not impair cost calculation by formula

  // 1. Get necessary data
  const cost = object.getProperty(`cost.progression`)
  assert(cost, `Cost must be defined`)

  const baseLevel = object.getProperty(`level.base`)
  assert(baseLevel, `Base level must be defined`)

  // 2. Calculate points
  //      POINTS = BASE_LEVEL * COST
  const points = getProgressionStep(cost, baseLevel - 1)

  output.mutations.push(OVERRIDE(`points.full`, points))
  return output
}

export function GCAComputeAdvantageLevel(object: MutableObject<RuntimeIGURPSGeneralTrait, GURPSCharacter>): MutationInput {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
  if (![`advantage`, `disadvantage`].includes(object.data.type)) return output
  if (object.data.children.length > 0) return output

  // if (object.id === `12943`) debugger // SK:Meditation
  // if (object.id === `15064`) debugger // SK:First Aid
  // if (object.id === `12975`) debugger // AD:Flight
  if (object.id === `13094`) debugger // AD:Talent (Breathing Techniques)

  // 1. Effectively calculate level
  const baseLevel = object.getProperty(`level.base`)

  const bonusLevel = object.getProperty(`level.bonus`) ?? 0
  assert(isNumber(bonusLevel) && !isNaN(bonusLevel), `Bonus must be a number`)

  const level = baseLevel + (bonusLevel ?? 0)

  assert(isNumber(level) && !isNaN(level), `Level value must be a number`)

  // if (object.id === `11228`) debugger

  output.mutations.push(OVERRIDE(`level.value`, level))

  return output
}
