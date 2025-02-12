import assert from "assert"
import { isNil } from "lodash"
import { Arguments, MaybeUndefined, Nilable, Nullable } from "tsdef"
import { OmitDeep } from "type-fest"

import { isNilOrEmpty, removeUndefinedKeys, split } from "@december/utils"
import { isNumeric } from "@december/utils/typing"
import { EQUALS } from "@december/utils/match/element"
import { PROPERTY, REFERENCE } from "@december/utils/access"

import { mergeMutationInput, MutableObject, MutationInput, SET, Strategy } from "@december/compiler"
import { PROPERTY_UPDATED } from "@december/compiler/controller/eventEmitter/event"

import { IGURPSSkillOrSpellOrTechnique } from "@december/gurps/trait"

import { GCAAttribute, GCAEquipment, GCASkillOrSpell } from "@december/gca"
import { getProgressionType, isProgression } from "@december/gca/utils/progression"

import GURPSCharacter from "../../../../character"
import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSEquipment, RuntimeIGURPSMode, RuntimeIGURPSModifier, RuntimeIGURPSSkillOrSpellOrTechnique, RuntimeIGURPSTraitDefaults } from "../runtime"
import { setupProcessing } from "../options"
import { parseTraitDefaults } from "./base"

export function GCAInitialize_Equipment(object: MutableObject, gca: GCAEquipment, baseTrait: RuntimeIGURPSBaseTrait<`equipment`>): MutationInput & { trait: RuntimeIGURPSEquipment } {
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
