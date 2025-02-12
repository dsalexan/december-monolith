import assert from "assert"
import { get, isNil, isNumber } from "lodash"
import { Arguments, MaybeUndefined, Nilable, NonNil, Nullable } from "tsdef"
import { OmitDeep } from "type-fest"

import { isNilOrEmpty, removeUndefinedKeys, split } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"
import { PROPERTY, Reference, REFERENCE } from "@december/utils/access"

import { NumericValue } from "@december/tree/interpreter"

import { mergeMutationInput, MutableObject, MutationInput, OVERRIDE, SET, Strategy } from "@december/compiler"
import { PROPERTY_UPDATED } from "@december/compiler/controller/eventEmitter/event"

import { IGURPSSkillOrSpellOrTechnique, IGURPSTraitExpression, isAlias, aliasToReference } from "@december/gurps/trait"

import { GCAAttribute, GCASkillOrSpell } from "@december/gca"
import { getProgressionType, isProgression } from "@december/gca/utils/progression"
import { calcProgressionCost, calcProgressionStep } from "@december/gurps/trait/definitions/cost"

import GURPSCharacter from "../../../../character"
import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSMode, RuntimeIGURPSModifier, RuntimeIGURPSSkillOrSpellOrTechnique, RuntimeIGURPSTraitDefaults } from "../runtime"
import { setupProcessing } from "../options"
import { parseTraitDefaults } from "./base"

export function GCAInitialize_SkillOrSpellOrTechnique(object: MutableObject, gca: GCASkillOrSpell, baseTrait: RuntimeIGURPSBaseTrait<`skill` | `spell` | `technique`>): MutationInput & { trait: RuntimeIGURPSSkillOrSpellOrTechnique } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  assert(!isNilOrEmpty(gca.type), `GCA skill/spell/technique must have a "type" property`)
  let attribute = gca.type.split(`/`)[0]
  const difficulty = gca.type.split(`/`)[1]! as `E` | `A` | `H` | `VH`

  let type: IGURPSSkillOrSpellOrTechnique[`type`] = baseTrait.type
  if (attribute.toLowerCase() === `tech`) {
    type = `technique`
    attribute = `unknown`
  }

  const cost = type === `technique` ? (difficulty === `A` ? `1/2` : `2/3`) : `1/2/4/8`
  const difficultyModifier = type === `technique` ? 1 : { E: 0, A: -1, H: -2, VH: -3 }[difficulty]
  const zeroCost = type === `technique` ? 0 : -4 + difficultyModifier + +(difficulty === `VH`)

  const { data: levelDefaultToTrait, ...output1 } = parseTraitDefaults(object, gca.default, `defaults.list`)
  output = mergeMutationInput(output, output1)

  // 2. Build BASE_TRAIT
  const trait: RuntimeIGURPSSkillOrSpellOrTechnique = {
    ...baseTrait,
    ...levelDefaultToTrait,
    //
    type,
    //
    level: {},
    points: {
      base: gca.basePoints,
      //
      value: gca.basePoints,
    },
    cost: {
      type: `progression`,
      display: null as any, // TODO: do this
      //
      progression: cost,
      modifier: difficultyModifier,
      default: zeroCost,
      round: gca.round === 1 ? `up` : gca.round === -1 ? `down` : `none`,
    },
    attribute,
    difficulty,
  }

  removeUndefinedKeys(trait)

  // if (object.id === `12984`) debugger
  // if (object.id === `12899`) debugger // SK:Karate

  // 3. Determine what to process
  const { options, environment } = setupProcessing(object)

  const inputs: Arguments<(typeof Strategy)[`bulkProcess`]>[1] = []
  // `defaults.list.${i}.expression` is already processed in parseTraitDefaults

  // 4. Pre-process stuff (for dependency graphs)
  if (inputs.length > 0) {
    const processingOutputs = Strategy.bulkProcess(object, inputs, {
      ...options,
      //
      syntacticalContext: { mode: `expression` },
    })

    for (const processingOutput of processingOutputs) output = mergeMutationInput(output, processingOutput)
  }

  // 5. Proxy attribute updates to level computations
  const integrityEntry = object.makeIntegrityEntry(`attribute`, attribute)
  output.integrityEntries.push(integrityEntry)

  const attributeReference = aliasToReference(attribute)
  Strategy.addProxyListener(PROPERTY_UPDATED(PROPERTY(attributeReference, EQUALS(`level.value`))), `GCA:compute:skill:defaults`, { integrityEntries: [integrityEntry] })(object)
  Strategy.addProxyListener(PROPERTY_UPDATED(PROPERTY(attributeReference, EQUALS(`level.value`))), `GCA:compute:skill:level:value`, { integrityEntries: [integrityEntry] })(object)

  return { ...output, trait: trait }
}

export function GCAComputeDefaults_Skill(
  object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>,
  defaultsIndex: number,
  traitExpression: Omit<IGURPSTraitExpression, `expression` | `value`>,
  bestDefaultIndex: Nilable<number>,
): MutationInput & { bestDefaultIndex: Nilable<number> } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  if (object.id === `12897`) debugger // SK:Breath Control

  // 1. Get state
  const state = get(object.metadata, `defaults.list.${defaultsIndex}.value`)
  assert(state, `State must be defined`)

  // 2. Get attribute score and cost definition
  const cost = object.getProperty(`cost`)

  const attributeAlias = object.getProperty(`attribute`)
  const attributes = object.controller.store.getByReference(new Reference(`alias`, attributeAlias), false) as MutableObject<RuntimeIGURPSAttribute>[]
  assert(attributes.length === 1, `Exactly one attribute must be found by alias`)

  const [attribute] = attributes
  const attributeLevel = attribute.getProperty(`level.value`)
  if (attributeLevel === undefined) return { ...output, bestDefaultIndex }

  // 3. Calculate "free" points gained by defaulting to this level
  if (traitExpression.isKnown && state.isReady()) {
    const level = state.getValue() as NumericValue
    const levelDifference = level.value - attributeLevel

    const freePoints = calcProgressionCost(cost, levelDifference)
    output.mutations.push(OVERRIDE(`defaults.list.${defaultsIndex}.points`, Math.max(freePoints, 0)))

    // (can only be a best default if there are free points gained by defaulting to this level)
    if (freePoints > 0) {
      //      (check if this is new best default)

      // 5. If there is no CURRENT DEFAULT (aka BEST DEFAULT), set this as default (only if processing is ready)
      if (isNil(bestDefaultIndex)) bestDefaultIndex = defaultsIndex
      // 6. If there is a currently best default, check it against this to choose bestest overall
      else {
        const currentDefault = object.getProperty(`defaults.list.${bestDefaultIndex}`) as MaybeUndefined<NonNil<RuntimeIGURPSSkillOrSpellOrTechnique[`defaults`]>[`list`][0]>
        assert(currentDefault, `Current default must be defined`)

        const currentFreePoints = currentDefault.points
        if (!isNil(currentFreePoints)) {
          if (freePoints > currentFreePoints) bestDefaultIndex = defaultsIndex
        }
      }
    }
  }

  return { ...output, bestDefaultIndex }
}

export function GCAComputeSkillLevel(object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>) {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
  // if (![`skill`, `spell`, `technique`].includes(object.data.type)) return output // TODO: Add technique back
  if (![`skill`].includes(object.data.type)) return output
  if (object.data.children.length > 0) return output

  // if (object.id === `12897`) debugger // SK:Breath Control

  // 1. Get (best) attribute level (from alias)
  const attributeAlias = object.getProperty(`attribute`)
  assert(attributeAlias, `Attribute alias must be defined`)
  const attributeReference = aliasToReference(attributeAlias)

  const bestAttribute = object.controller.getBestTrait(attributeReference)
  const attributeLevel = bestAttribute?.getProperty(`level.value`) as MaybeUndefined<number>
  if (attributeLevel === undefined) return output

  let freePoints: number = 0
  let baseLevel = attributeLevel
  let base: IGURPSSkillOrSpellOrTechnique[`level`][`base`] = { type: `attribute`, level: attributeLevel }

  // 2. Setup calculation through default
  const defaultIndex = object.getProperty(`defaults.best`)
  if (defaultIndex !== undefined) {
    base = { type: `default`, index: defaultIndex }

    const defaults = object.getProperty(`defaults.list.${defaultIndex}`) as MaybeUndefined<NonNil<RuntimeIGURPSSkillOrSpellOrTechnique[`defaults`]>[`list`][0]>
    assert(defaults, `Default must be defined`)

    const defaultValue = defaults.value
    assert(defaultValue !== undefined, `Value must be defined`)
    baseLevel = defaultValue.asNumber()

    const freePoints = defaults.points!
    assert(freePoints !== undefined, `Free points must be defined`)
  }

  // 3. Calculate "bought" level (from points)
  const cost = object.getProperty(`cost`)

  const basePoints = object.getProperty(`points.base`)
  const points = basePoints + freePoints

  const boughtLevel = calcProgressionStep(cost, points)
  assert(isNumber(boughtLevel) && !isNaN(boughtLevel), `Bought level must be a number`)

  // 4. Calculate level
  const bonusLevel = object.getProperty(`level.bonus`) ?? 0
  assert(isNumber(bonusLevel) && !isNaN(bonusLevel), `Bonus must be a number`)

  const level = baseLevel + boughtLevel + bonusLevel
  assert(isNumber(level) && !isNaN(level), `Level value must be a number`)

  // if (object.id === `11228`) debugger

  output.mutations.push(OVERRIDE(`level.bought`, boughtLevel))
  output.mutations.push(OVERRIDE(`level.base`, base))
  output.mutations.push(OVERRIDE(`level.value`, level))

  return output
}
