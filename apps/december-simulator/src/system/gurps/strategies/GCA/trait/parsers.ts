import assert from "assert"
import { isNil } from "lodash"
import { MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"

import { isNilOrEmpty, removeUndefinedKeys } from "@december/utils"
import { NumericValue, StringValue } from "@december/tree/interpreter"
import { mergeMutationInput, MutationInput, SET } from "@december/compiler"

import { GCAAttribute, GCAEquipment, GCAGeneralTrait, GCAModifier, GCASkillOrSpell, GCATrait } from "@december/gca"
import { isProgression } from "@december/gca/utils/progression"
import { Utils } from "@december/gurps"
import { getAliases, IGURPSAttribute, IGURPSBaseTrait, IGURPSEquipment, IGURPSGeneralTrait, IGURPSModifier, IGURPSSkillOrSpellOrTechnique, IGURPSTrait, IGURPSTraitOrModifier, Type } from "@december/gurps/trait"
import { MergeDeep, OmitDeep } from "type-fest"
import { isNumeric } from "../../../../../../../../packages/utils/src/typing"

export function parseTraitOrModifier(gca: GCATrait | GCAModifier): MutationInput & { traitOrModifier: IGURPSTraitOrModifier } {
  const output: MutationInput = { mutations: [], integrityEntries: [] }

  // 1. Parse some objects
  const isParent = !isNilOrEmpty(gca.childKeyList)
  const isAttribute = gca.section === `attributes` // some attributes are not explicitly specified in the books

  if (!isParent && !isAttribute) assert(!isNil(gca.page), `GCA trait must have a "page" property`)
  if (gca.group && gca.group.includes(`,`)) debugger // TODO: Handle multiple groups

  const mods = isNil(gca.mods) ? undefined : split(gca.mods)

  // 2. Build BASE (aka "traits-and-modifiers", really basic shit for traits {and modifiers, but we don't get modifiers directly here})
  const traitOrModifier: IGURPSTraitOrModifier = {
    type: Type.fromGCASection(gca.section),
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

export function parseBaseTrait(gca: GCATrait, traitOrModifier: IGURPSTraitOrModifier<IGURPSBaseTrait[`type`]>): MutationInput & { baseTrait: IGURPSBaseTrait } {
  let output: MutationInput = { mutations: [], integrityEntries: [] }

  // 1. Parse some objects
  let notes: IGURPSBaseTrait[`notes`] = undefined
  if (!isNilOrEmpty(gca.itemNotes) || !isNilOrEmpty(gca.userNotes)) {
    notes ??= {}

    if (!isNilOrEmpty(gca.itemNotes)) notes!.short = split(gca.itemNotes)
    if (!isNilOrEmpty(gca.userNotes)) notes!.long = split(gca.userNotes)
  }

  // 2. Build BASE_TRAIT
  const baseTrait: IGURPSBaseTrait = {
    ...traitOrModifier,
    cost: null as any,
    //
    notes,
    //
    modes: [], // TODO: do this
    modifiers: [],
  }

  removeUndefinedKeys(baseTrait)

  // 3. Parse modifiers and modes
  const step1 = gca.modifiers.map(gca => ({ gca, ...parseTraitOrModifier(gca) }))
  const step2 = step1.map(({ gca, traitOrModifier }) => parseModifier(gca, traitOrModifier as IGURPSTraitOrModifier<`modifier`>))
  for (const { modifier, ...output1 } of step2) {
    baseTrait.modifiers.push(modifier)
    output = mergeMutationInput(output, output1)
  }

  if (gca.modifiers.length > 1) debugger

  return { ...output, baseTrait }
}

export function parseModifier(gca: GCAModifier, traitOrModifier: IGURPSTraitOrModifier<`modifier`>): MutationInput & { modifier: RuntimeIGURPSModifier } {
  const output: MutationInput = { mutations: [], integrityEntries: [] }

  // 1. Parse some objects
  let levelNames: MaybeUndefined<string[]> = undefined
  if (!isNilOrEmpty(gca.levelNames)) levelNames = split(gca.levelNames)

  assert(!isNil(gca.level), `GCA modifier must have a "level" property`)

  let progression: MaybeUndefined<string> = undefined
  let expression: MaybeUndefined<string> = undefined

  expression = gca.formula
  if (!gca.forceFormula) progression = gca.cost

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
    },
  }

  removeUndefinedKeys(modifier)

  return { ...output, modifier: modifier as RuntimeIGURPSModifier }
}

// #region SPECIFICS

export function parseAttribute(gca: GCAAttribute, baseTrait: IGURPSBaseTrait<`attribute`>): MutationInput & { trait: RuntimeIGURPSAttribute } {
  const output: MutationInput = { mutations: [], integrityEntries: [] }

  // 1. Parse some objects
  let base: RuntimeIGURPSAttribute[`score`][`base`]
  if (!isNilOrEmpty(gca.baseValue)) base = { source: gca.baseValue }
  else base = { source: `0` }

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
    points: {
      base: gca.basePoints,
    },
    cost: {
      type: `step`,
      // display: null, // TODO: Compile display on update @ COST.INCREMENT, COST.DECREMENT, COST.STEP (because increment or decrement could be expression dependant)
      //
      increment,
      decrement,
      step,
    },
    //
    symbol: gca.symbol,
  }

  removeUndefinedKeys(trait)

  return { ...output, trait: trait as RuntimeIGURPSAttribute }
}

export function parseSkillOrSpellOrTechnique(gca: GCASkillOrSpell, baseTrait: IGURPSBaseTrait<`skill` | `spell` | `technique`>): MutationInput & { trait: RuntimeIGURPSSkillOrSpellOrTechnique } {
  const output: MutationInput = { mutations: [], integrityEntries: [] }

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
    },
    cost: {
      type: `progression`,
      display: null as any, // TODO: do this
      //
      progression: cost,
      modifier: difficultyModifier,
      default: zeroCost,
    },
    difficulty,
  }

  removeUndefinedKeys(trait)

  return { ...output, trait: trait as RuntimeIGURPSSkillOrSpellOrTechnique }
}

export function parseEquipment(gca: GCAEquipment, baseTrait: IGURPSBaseTrait<`equipment`>): MutationInput & { trait: RuntimeIGURPSEquipment } {
  const output: MutationInput = { mutations: [], integrityEntries: [] }

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

export function parseGeneralTrait(gca: GCAGeneralTrait, baseTrait: IGURPSBaseTrait<IGURPSGeneralTrait[`type`]>): MutationInput & { trait: RuntimeIGURPSGeneralTrait } {
  const output: MutationInput = { mutations: [], integrityEntries: [] }

  // 1. Parse some objects
  let levelNames: MaybeUndefined<string[]> = undefined
  if (!isNilOrEmpty(gca.levelNames)) levelNames = split(gca.levelNames)

  assert(!isNil(gca.baseLevel), `Missing baselevl`)
  assert(!isNilOrEmpty(gca.cost), `Missing cost`)

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
      expression: gca.cost,
    },
  }

  removeUndefinedKeys(trait)

  return { ...output, trait: trait as RuntimeIGURPSGeneralTrait }
}

// #endregion

// #region RUNTIME_INTERFACES

export interface PartialRuntimeIGURPSAttribute {
  score: {
    base: {
      value?: NumericValue
    }
    minimum?: {
      value?: NumericValue
    }
    //
    value?: NumericValue
  }
  //
  cost: {
    increment: { progression: string } | { value?: NumericValue }
    decrement: { progression: string } | { value?: NumericValue }
  }
}

export type RuntimeIGURPSAttribute = MergeDeep<IGURPSAttribute, PartialRuntimeIGURPSAttribute>

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
    value?: NumericValue
  }
}

export type RuntimeIGURPSSkillOrSpellOrTechnique = MergeDeep<IGURPSSkillOrSpellOrTechnique, PartialRuntimeIGURPSSkillOrSpellOrTechnique>

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

export type RuntimeIGURPSEquipment = MergeDeep<IGURPSEquipment, PartialRuntimeIGURPSEquipment>

export interface PartialRuntimeIGURPSGeneralTrait {
  points: {
    value?: NumericValue
  }
}

export type RuntimeIGURPSGeneralTrait = MergeDeep<IGURPSGeneralTrait, PartialRuntimeIGURPSGeneralTrait>

export type RuntimeIGURPSTrait = RuntimeIGURPSAttribute | RuntimeIGURPSSkillOrSpellOrTechnique | RuntimeIGURPSEquipment | RuntimeIGURPSGeneralTrait

//

export interface PartialRuntimeIGURPSModifier {
  modifier: {
    type?: StringValue<`integer` | `percentage` | `multiplier`>
    value?: NumericValue
  }
}

export type RuntimeIGURPSModifier = MergeDeep<IGURPSModifier, PartialRuntimeIGURPSModifier>

// #endregion

// #region UTILS

function split(string: string): string[] {
  return string.split(/ *, */).map(mod => mod.trim())
}

// #endregion
