import assert from "assert"
import { isNil } from "lodash"
import { Arguments, MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"

import { isNilOrEmpty, removeUndefinedKeys } from "@december/utils"
import { Environment, NumericValue, StringValue } from "@december/tree/interpreter"
import { mergeMutationInput, MutableObject, MutationInput, SET, Strategy } from "@december/compiler"

import { GCAAttribute, GCAEquipment, GCAGeneralTrait, GCAModifier, GCASkillOrSpell, GCATrait } from "@december/gca"
import { getProgressionType, isProgression } from "@december/gca/utils/progression"
import { Utils } from "@december/gurps"
import {
  getAliases,
  IGURPSAttribute,
  IGURPSBaseTrait,
  IGURPSEquipment,
  IGURPSGeneralTrait,
  IGURPSModifier,
  IGURPSSkillOrSpellOrTechnique,
  IGURPSTrait,
  IGURPSTraitOrModifier,
  isAlias,
  makeGURPSTraitEnvironment,
  Type,
} from "@december/gurps/trait"
import { Get, MergeDeep, OmitDeep } from "type-fest"
import { isNumeric } from "../../../../../../../../packages/utils/src/typing"
import { TraitType } from "../../../../../../../../packages/gurps/src/trait/type"
import { GCAStrategyProcessorListenOptions, GCAStrategyProcessorOptionsGenerator, setupProcessing } from "./options"

export function parseTraitOrModifier(object: MutableObject, gca: GCATrait | GCAModifier): MutationInput & { traitOrModifier: IGURPSTraitOrModifier } {
  const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  const children: string[] = !isNilOrEmpty(gca.childKeyList) ? split(gca.childKeyList).filter(id => id !== ``) : []

  const isParent = children.length > 0
  const isAttribute = gca.section === `attributes` // some attributes are not explicitly specified in the books
  const isModifier = gca.section === `modifiers` // some modifiers are not explicitly specified in the books
  const ignore = [`_Free`, `_List`, `Smell Only`, `Alternate Form`].includes(gca.name)

  if (!isParent && !isAttribute && !isModifier && !ignore) assert(!isNil(gca.page), `GCA trait must have a "page" property`)
  if (gca.group && gca.group.includes(`,`)) debugger // TODO: Handle multiple groups

  const mods = isNil(gca.mods) ? undefined : split(gca.mods)

  // 2. Build BASE (aka "traits-and-modifiers", really basic shit for traits {and modifiers, but we don't get modifiers directly here})
  const traitOrModifier: IGURPSTraitOrModifier = {
    id: object.id,
    type: Type.fromGCASection(gca.section),
    children,
    //
    name: gca.name,
    nameExtension: gca.nameExt,
    description: gca.description,
    //
    reference: !isNil(gca.page) ? Utils.parsePageNotation(gca.page) : null,
    //
    group: gca.group,
    mods,
  }

  removeUndefinedKeys(traitOrModifier)

  // 2. Build aliases
  if (gca.section !== `modifiers`) {
    const aliases = getAliases(traitOrModifier.type, traitOrModifier.name, { nameExtension: traitOrModifier.nameExtension, group: traitOrModifier.group })
    output.mutations.push(SET(`__.aliases`, aliases))
  }

  return { ...output, traitOrModifier }
}

export function parseBaseTrait(object: MutableObject, gca: GCATrait, traitOrModifier: IGURPSTraitOrModifier<IGURPSBaseTrait[`type`]>): MutationInput & { baseTrait: RuntimeIGURPSBaseTrait } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let notes: IGURPSBaseTrait[`notes`] = undefined
  if (!isNilOrEmpty(gca.itemNotes) || !isNilOrEmpty(gca.userNotes)) {
    notes ??= {}

    if (!isNilOrEmpty(gca.itemNotes)) notes!.short = split(gca.itemNotes)
    if (!isNilOrEmpty(gca.userNotes)) notes!.long = split(gca.userNotes)
  }

  // 2. Build BASE_TRAIT
  const baseTrait: RuntimeIGURPSBaseTrait = {
    ...traitOrModifier,
    cost: null as any,
    //
    childProfile: gca.childProfile === 1 ? `alternative-attacks` : gca.childProfile === 2 ? `apply-modifiers-to-children` : `regular`,
    //
    notes,
    //
    modes: [], // TODO: do this
    modifiers: [],
    //
    radius: 0,
  }

  removeUndefinedKeys(baseTrait)

  // // 3. Parse modifiers and modes
  // const step1 = gca.modifiers.map(gca => ({ gca, ...parseTraitOrModifier(gca) }))
  // const step2 = step1.map(({ gca, traitOrModifier }) => parseModifier(object, gca, traitOrModifier as IGURPSTraitOrModifier<`modifier`>))
  // for (const { modifier, ...output1 } of step2) {
  //   baseTrait.modifiers.push(modifier)
  //   output = mergeMutationInput(output, output1)
  // }

  return { ...output, baseTrait }
}

export function parseModifier(object: MutableObject, gca: GCAModifier, traitOrModifier: IGURPSTraitOrModifier<`modifier`>): MutationInput & { modifier: RuntimeIGURPSModifier } {
  const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let levelNames: MaybeUndefined<string[]> = undefined
  if (!isNilOrEmpty(gca.levelNames)) levelNames = split(gca.levelNames)

  assert(!isNil(gca.level), `GCA modifier must have a "level" property`)

  let progression: MaybeUndefined<string> = undefined
  let expression: MaybeUndefined<string> = undefined

  expression = gca.formula
  if (!gca.forceFormula) progression = gca.cost

  let type: IGURPSModifier[`modifier`][`type`] = `integer`
  if (gca.cost) type = getProgressionType(gca.cost, false)

  // 2. Build BASE_TRAIT
  const modifier: RuntimeIGURPSModifier = {
    ...traitOrModifier,
    //
    shortName: gca.shortName,
    level: {
      names: levelNames,
      value: gca.level,
    },
    modifier: {
      display: null as any, // TODO: do this
      //
      progression,
      expression,
      type,
      round: gca.round === 1 ? `up` : gca.round === -1 ? `down` : `none`,
      //
    },
  }

  removeUndefinedKeys(modifier)

  return { ...output, modifier: modifier as RuntimeIGURPSModifier }
}

// #region SPECIFICS

export function parseAttribute(object: MutableObject, gca: GCAAttribute, baseTrait: RuntimeIGURPSBaseTrait<`attribute`>): MutationInput & { trait: RuntimeIGURPSAttribute } {
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
    { path: `score.base.initial`, expression: trait.score.base.source, environment, reProcessingFunction: `GCA:compute:score:initial` }, //
  ]

  if (`expression` in trait.cost.increment) {
    debugger
    inputs.push({ path: `cost.increment.value`, expression: trait.cost.increment.expression, environment, reProcessingFunction: `GCA:compute:score:increment` })
  }

  if (`expression` in trait.cost.decrement) {
    debugger
    inputs.push({ path: `cost.decrement.value`, expression: trait.cost.decrement.expression, environment, reProcessingFunction: `GCA:compute:score:decrement` })
  }

  // 4. Pre-process stuff (for dependency graphs)
  const processingOutputs = Strategy.bulkProcess(object, inputs, {
    ...options,
    //
    syntacticalContext: { mode: `expression` },
  })

  for (const processingOutput of processingOutputs) output = mergeMutationInput(output, processingOutput)

  return { ...output, trait: trait as RuntimeIGURPSAttribute }
}

export function parseSkillOrSpellOrTechnique(object: MutableObject, gca: GCASkillOrSpell, baseTrait: RuntimeIGURPSBaseTrait<`skill` | `spell` | `technique`>): MutationInput & { trait: RuntimeIGURPSSkillOrSpellOrTechnique } {
  const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  assert(!isNilOrEmpty(gca.type), `GCA skill/spell/technique must have a "type" property`)
  const attribute = gca.type.split(`/`)[0]
  const difficulty = gca.type.split(`/`)[1]! as `E` | `A` | `H` | `VH`

  let type: IGURPSSkillOrSpellOrTechnique[`type`] = baseTrait.type
  if (attribute.toLowerCase() === `tech`) type = `technique`

  const cost = type === `technique` ? (difficulty === `A` ? `1/2` : `2/3`) : `1/2/4/8`
  const difficultyModifier = type === `technique` ? 1 : { E: 0, A: -1, H: -2, VH: -3 }[difficulty]
  const zeroCost = type === `technique` ? 0 : -4 + difficultyModifier + +(difficulty === `VH`)

  let defaults: RuntimeIGURPSSkillOrSpellOrTechnique[`level`][`defaults`]

  if (!isNilOrEmpty(gca.default)) defaults = split(gca.default).map(notation => ({ expression: notation }))
  else defaults = null

  // 2. Build BASE_TRAIT
  const trait: RuntimeIGURPSSkillOrSpellOrTechnique = {
    ...baseTrait,
    type,
    //
    level: {
      defaults,
    },
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
    difficulty,
  }

  removeUndefinedKeys(trait)

  return { ...output, trait: trait as RuntimeIGURPSSkillOrSpellOrTechnique }
}

export function parseEquipment(object: MutableObject, gca: GCAEquipment, baseTrait: RuntimeIGURPSBaseTrait<`equipment`>): MutationInput & { trait: RuntimeIGURPSEquipment } {
  const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  assert(!isNil(gca.count), `GCA equipment must have a "count" property`)

  let maximumCount: MaybeUndefined<number> = undefined
  if (!isNilOrEmpty(gca.upTo)) {
    if (isNumeric(gca.upTo)) maximumCount = parseInt(gca.upTo)
    else throw new Error(`GCA equipment must have a "upTo" property`)
  }

  let baseCount: MaybeUndefined<number> = 1
  if (!isNilOrEmpty(gca.baseQty)) {
    if (isNumeric(gca.baseQty)) baseCount = parseInt(gca.baseQty)
    else throw new Error(`GCA equipment must have a "baseQty" property`)
  }

  // 2. Build BASE_TRAIT
  const trait: RuntimeIGURPSEquipment = {
    ...baseTrait,
    //
    count: {
      base: baseCount,
      maximum: maximumCount,
      value: gca.count,
    },
    cost: {
      type: `monetary`,
      display: null as any, // TODO: do this
      //
      unitaryExpression: gca.baseCostFormula ?? gca.baseCost,
      expression: gca.costFormula ?? gca.formula,
    },
    weight: {
      unitaryExpression: gca.baseWeightFormula ?? gca.baseWeight,
      expression: gca.weightFormula,
    },
    //
    location: null as any, // TODO: do this
    whereItIsKept: gca.where,
    //
    minimumTechLevel: gca.techLevel,
    techLevel: gca.tl,
  }

  removeUndefinedKeys(trait)

  // TODO: handle children shit here

  return { ...output, trait: trait as RuntimeIGURPSEquipment }
}

export function parseGeneralTrait(object: MutableObject, gca: GCAGeneralTrait, baseTrait: RuntimeIGURPSBaseTrait<IGURPSGeneralTrait[`type`]>): MutationInput & { trait: RuntimeIGURPSGeneralTrait } {
  const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let levelNames: MaybeUndefined<string[]> = undefined
  if (!isNilOrEmpty(gca.levelNames)) levelNames = split(gca.levelNames)

  assert(!isNil(gca.baseLevel), `Missing baselevl`)
  if (baseTrait.childProfile === `regular`) assert(!isNilOrEmpty(gca.cost), `Missing cost`)

  // 2. Build BASE_TRAIT
  const trait: RuntimeIGURPSGeneralTrait = {
    ...baseTrait,
    //
    level: {
      names: levelNames,
      base: gca.baseLevel,
    },
    points: {},
    cost: {
      type: `level`,
      display: null as any, // TODO: DO THIS
      //
      expression: baseTrait.childProfile === `regular` ? gca.cost! : null,
    },
  }

  removeUndefinedKeys(trait)

  return { ...output, trait: trait as RuntimeIGURPSGeneralTrait }
}

// #endregion

// #region RUNTIME_INTERFACES

export interface PartialRuntimeIGURPSBaseTrait {
  modifiers: RuntimeIGURPSModifier[]
}

export type RuntimeIGURPSBaseTrait<TType extends Exclude<TraitType, `modifier`> = Exclude<TraitType, `modifier`>> = IGURPSBaseTrait<TType> & PartialRuntimeIGURPSBaseTrait

//

export interface PartialRuntimeIGURPSAttribute {
  score: {
    base: {
      initial?: NumericValue
      value?: number
    }
    minimum?: {
      value?: NumericValue
    }
    //
    value?: number
  }
  level: {
    value?: number // basically the same as "score.value"
  }
  //
  cost: {
    increment: { progression: string } | { value?: NumericValue }
    decrement: { progression: string } | { value?: NumericValue }
  }
}

export type RuntimeIGURPSAttribute = MergeDeep<MergeDeep<IGURPSAttribute, PartialRuntimeIGURPSAttribute>, PartialRuntimeIGURPSBaseTrait>

export interface PartialRuntimeIGURPSSkillOrSpellOrTechnique {
  level: {
    defaults: Nullable<
      {
        expression: string
        //
        trait?: StringValue
        level?: NumericValue
      }[]
    >
    value?: number
  }
}

export type RuntimeIGURPSSkillOrSpellOrTechnique = MergeDeep<MergeDeep<IGURPSSkillOrSpellOrTechnique, PartialRuntimeIGURPSSkillOrSpellOrTechnique>, PartialRuntimeIGURPSBaseTrait>

export interface PartialRuntimeIGURPSEquipment {
  cost: {
    unitary?: NumericValue
    value?: NumericValue
  }
  weight: {
    unitary?: NumericValue
    value?: NumericValue
  }
}

export type RuntimeIGURPSEquipment = MergeDeep<MergeDeep<IGURPSEquipment, PartialRuntimeIGURPSEquipment>, PartialRuntimeIGURPSBaseTrait>

export interface PartialRuntimeIGURPSGeneralTrait {
  level: {
    value?: number
  }
  points: {
    value?: number
  }
}

export type RuntimeIGURPSGeneralTrait = MergeDeep<MergeDeep<IGURPSGeneralTrait, PartialRuntimeIGURPSGeneralTrait>, PartialRuntimeIGURPSBaseTrait>

export type RuntimeIGURPSTrait = RuntimeIGURPSAttribute | RuntimeIGURPSSkillOrSpellOrTechnique | RuntimeIGURPSEquipment | RuntimeIGURPSGeneralTrait

//

export interface PartialRuntimeIGURPSModifier {
  // level: {
  //   value?: NumericValue
  // }
  modifier: {
    // type?: StringValue<`integer` | `percentage` | `multiplier`> // IMPLIED BY EXPECTED_TYPE
    value?: NumericValue
  }
}

export type RuntimeIGURPSModifier = MergeDeep<IGURPSModifier, PartialRuntimeIGURPSModifier>

//

export type type = Get<RuntimeIGURPSModifier, `type`>
//            ^?

export type points = Get<RuntimeIGURPSEquipment, `points.value`>
//            ^?
export type points1 = Get<Exclude<RuntimeIGURPSTrait, RuntimeIGURPSEquipment>, `points.value`>
//            ^?

export type level = Get<RuntimeIGURPSTrait | RuntimeIGURPSModifier, `level.value`>
//            ^?
export type level1 = Get<RuntimeIGURPSSkillOrSpellOrTechnique | RuntimeIGURPSGeneralTrait, `level.value`>
//            ^?
export type level2 = Get<RuntimeIGURPSModifier, `level.value`>
//            ^?

export type score = Get<RuntimeIGURPSTrait, `score.value`>
//            ^?
export type score1 = Get<RuntimeIGURPSAttribute, `score.value`>
//            ^?

// #endregion

// #region UTILS

function split(string: string): string[] {
  return string.split(/ *, */).map(mod => mod.trim())
}

// #endregion
