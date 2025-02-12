import { Get, OmitDeep } from "type-fest"
import { NonNil, Nullable } from "tsdef"

import { BooleanValue, NumericValue, StringValue } from "@december/tree/interpreter"

import {
  TraitType,
  IGURPSBaseTrait,
  IGURPSModifier,
  IGURPSMode,
  IGURPSTraitDefaults,
  IGURPSTraitExpression,
  IGURPSAttribute,
  IGURPSSkillOrSpellOrTechnique,
  IGURPSEquipment,
  IGURPSGeneralTrait,
  GeneralTraitType,
} from "@december/gurps/trait"
import { RuntimeIGURPSBonus } from "@december/gurps/trait/bonus"

// #region PARTIAL INTERFACES

export type NonRuntimeIGURPSTraitExpression = OmitDeep<IGURPSTraitExpression, `trait` | `isKnown` | `value`>
export interface RuntimeIGURPSTraitExpression extends NonRuntimeIGURPSTraitExpression {
  trait?: IGURPSBaseTrait
  isKnown?: boolean
  value?: NumericValue
}

export interface RuntimeIGURPSTraitDefaults<TTraitExpression extends RuntimeIGURPSTraitExpression = RuntimeIGURPSTraitExpression> {
  defaults: Nullable<{
    // Default(), SkillUsed()
    list: TTraitExpression[] // list of expressions targeting traits
    // CharSkillUsed()
    best?: number // index of defaults corresponding to BEST DEFAULT LEVEL
  }>
}

type levelDefaultingToTrait = Get<RuntimeIGURPSTraitDefaults, `defaults`>
//              ^?
type levelDefaultingToTrait1 = NonNil<Get<RuntimeIGURPSTraitDefaults, `defaults.list`>>[0][`value`]
//              ^?

// #endregion

// #region DEEP INTERFACES

export type NonRuntimeIGURPSMode = OmitDeep<IGURPSMode, `defaults` | `level.value`>
export interface RuntimeIGURPSMode extends RuntimeIGURPSTraitDefaults, NonRuntimeIGURPSMode {
  level: NonRuntimeIGURPSMode[`level`] & {
    value?: number
  }
}

export type NonRuntimeIGURPSModifier = OmitDeep<IGURPSModifier, `modifier.value`>
export interface RuntimeIGURPSModifier extends NonRuntimeIGURPSModifier {
  modifier: NonRuntimeIGURPSModifier[`modifier`] & {
    value?: NumericValue
  }
}

type mode = Get<RuntimeIGURPSMode, `level`>
//            ^?
type mode1 = Get<RuntimeIGURPSMode, `level.defaults`>
//            ^?

type modifier = Get<RuntimeIGURPSModifier, `modifier`>
//            ^?
type modifier1 = Get<RuntimeIGURPSModifier, `modifier.value`>
//            ^?

// #endregion

// #region BASE INTERFACES

type RuntimeIGURPSBaseTraitKeys = `modes` | `modifiers` | `bonuses`
export type NonRuntimeIGURPSBaseTrait<TType extends Exclude<TraitType, `modifier`> = Exclude<TraitType, `modifier`>> = OmitDeep<IGURPSBaseTrait<TType>, RuntimeIGURPSBaseTraitKeys>
export interface RuntimeIGURPSBaseTrait<TType extends Exclude<TraitType, `modifier`> = Exclude<TraitType, `modifier`>> extends NonRuntimeIGURPSBaseTrait<TType> {
  modes: RuntimeIGURPSMode[]
  modifiers: RuntimeIGURPSModifier[]
  bonuses: RuntimeIGURPSBonus<BooleanValue, NumericValue, StringValue>[]
}

type base = Get<RuntimeIGURPSBaseTrait<`attribute`>, `modes`>[0]
//   ^?

// #endregion

// #region SPECIFIC INTERFACES

export type NonRuntimeIGURPSAttribute = OmitDeep<IGURPSAttribute, RuntimeIGURPSBaseTraitKeys | `score.base.initial` | `score.base.value` | `score.minimum.value` | `score.value` | `level.value` | `cost.increment` | `cost.decrement`>
export interface RuntimeIGURPSAttribute extends RuntimeIGURPSBaseTrait<`attribute`>, NonRuntimeIGURPSAttribute {
  score: {
    base: NonRuntimeIGURPSAttribute[`score`][`base`] & {
      initial?: NumericValue
      value?: number
    }
    minimum?: NonRuntimeIGURPSAttribute[`score`][`minimum`] & {
      value?: NumericValue
    }
    //
    value?: number
  }
  level: NonRuntimeIGURPSAttribute[`level`] & {
    value?: number // basically the same as "score.value"
  }
  //
  cost: NonRuntimeIGURPSAttribute[`cost`] & {
    increment: { progression: string } | { expression: string; value?: NumericValue }
    decrement: { progression: string } | { expression: string; value?: NumericValue }
  }
}

export type NonRuntimeIGURPSSkillOrSpellOrTechnique = OmitDeep<IGURPSSkillOrSpellOrTechnique, RuntimeIGURPSBaseTraitKeys | `defaults` | `level.value` | `level.bought` | `level.base`>
export interface RuntimeIGURPSSkillOrSpellOrTechnique extends RuntimeIGURPSBaseTrait<`spell` | `skill` | `technique`>, RuntimeIGURPSTraitDefaults<RuntimeIGURPSTraitExpression & { points?: number }>, NonRuntimeIGURPSSkillOrSpellOrTechnique {
  level: NonRuntimeIGURPSSkillOrSpellOrTechnique[`level`] & {
    bought?: number
    base?: IGURPSSkillOrSpellOrTechnique[`level`][`base`]
    value?: number
  }
}

export type NonRuntimeIGURPSEquipment = OmitDeep<IGURPSEquipment, RuntimeIGURPSBaseTraitKeys | `cost.unitary` | `cost.value` | `weight.unitary` | `weight.value`>
export interface RuntimeIGURPSEquipment extends RuntimeIGURPSBaseTrait<`equipment`>, NonRuntimeIGURPSEquipment {
  cost: NonRuntimeIGURPSEquipment[`cost`] & {
    unitary?: NumericValue
    value?: NumericValue
  }
  weight: NonRuntimeIGURPSEquipment[`weight`] & {
    unitary?: NumericValue
    value?: NumericValue
  }
}

export type NonRuntimeIGURPSGeneralTrait = OmitDeep<IGURPSGeneralTrait, RuntimeIGURPSBaseTraitKeys | `type` | `level.value` | `points.full` | `points.value`>
export interface RuntimeIGURPSGeneralTrait<TType extends GeneralTraitType = GeneralTraitType> extends RuntimeIGURPSBaseTrait<TType>, NonRuntimeIGURPSGeneralTrait {
  level: NonRuntimeIGURPSGeneralTrait[`level`] & {
    value?: number
  }
  points: NonRuntimeIGURPSGeneralTrait[`points`] & {
    full?: NumericValue
    value?: NumericValue
  }
}

export type RuntimeIGURPSTrait = RuntimeIGURPSAttribute | RuntimeIGURPSSkillOrSpellOrTechnique | RuntimeIGURPSEquipment | RuntimeIGURPSGeneralTrait

//
//

type attribute = Get<RuntimeIGURPSAttribute, `score`>
//            ^?
type attribute1 = Get<RuntimeIGURPSAttribute, `score.base.source`>
//            ^?

type skill = Get<RuntimeIGURPSSkillOrSpellOrTechnique, `level`>
//     ^?
type skill1 = Get<RuntimeIGURPSSkillOrSpellOrTechnique, `level.bought`>
//     ^?
type skill2 = Get<RuntimeIGURPSSkillOrSpellOrTechnique, `level.base`>
//     ^?
type skill3 = Get<RuntimeIGURPSSkillOrSpellOrTechnique, `level.base`>
//     ^?
type skill4 = Get<NonRuntimeIGURPSSkillOrSpellOrTechnique, `level.bought`>
//     ^?

type equipment = Get<RuntimeIGURPSEquipment, `cost`>
//            ^?
type equipment1 = Get<RuntimeIGURPSEquipment, `weight.value`>
//            ^?

type general = Get<RuntimeIGURPSGeneralTrait, `level.value`>
//            ^?
type general1 = Get<NonRuntimeIGURPSGeneralTrait, `points`>
//            ^?
type general2 = Get<RuntimeIGURPSGeneralTrait, `points`>
//            ^?
type general3 = Get<NonRuntimeIGURPSGeneralTrait, `cost`>
//    ^?
type general4 = Get<RuntimeIGURPSBaseTrait<GeneralTraitType>, `type`>
//    ^?
type general5 = Get<NonRuntimeIGURPSGeneralTrait, `type`>
//    ^?

// #endregion

type type = Get<RuntimeIGURPSModifier, `type`>
//            ^?

// export type points = Get<RuntimeIGURPSEquipment, `points.value`>
// //            ^?
// export type points1 = Get<Exclude<RuntimeIGURPSTrait, RuntimeIGURPSEquipment>, `points.value`>
// //            ^?

// export type level = Get<RuntimeIGURPSTrait | RuntimeIGURPSModifier, `level.value`>
// //            ^?
// export type level1 = Get<RuntimeIGURPSSkillOrSpellOrTechnique | RuntimeIGURPSGeneralTrait, `level.value`>
// //            ^?
// export type level2 = Get<RuntimeIGURPSModifier, `level.value`>
// //            ^?

// export type score = Get<RuntimeIGURPSTrait, `score.value`>
// //            ^?
// export type score1 = Get<RuntimeIGURPSAttribute, `score.value`>
// //            ^?
