import { Nullable } from "tsdef"

import { BooleanValue, NumericValue, ObjectValue, RuntimeValue, StringValue } from "@december/tree/interpreter"
import { NumericOrDiceValue, DiceRollValue, DiceNotationValue } from "@december/system/dice"
import { Quantity } from "@december/utils/unit"
import { TagName } from "@december/gca/trait"

import { TraitType } from "../type"
import { DamageType } from "../../mechanics/damage/type"

/**
 * COMPARISON is the comparison you're making, and uses the same selection as Trait Selectors, which are these:
 *  IS            TAG and VALUE are not the same
 *  ISNOT         TAG and VALUE are the same
 *  INCLUDES      VALUE is not found inside TAG
 *  EXCLUDES      VALUE can be found inside TAG
 *  LISTINCLUDES  TAG is treated as a list, and VALUE is found as one of the list items
 *  LISTEXCLUDES  TAG is treated as a list, and VALUE is not found as one of the list items
 */
export type TraitSelector = `Is` | `IsNot` | `Includes` | `Excludes` | `ListIncludes` | `ListExcludes`
export type TraitSelectorSubcriteria = `OneOf` | `AnyOf` | `AllOf` | `NoneOf`

//
//
//
//
//

export interface SystemTrait {
  display?: {
    name?: StringValue // DisplayName(), DisplayNameFormula()
    cost?: string // DisplayCost()
    scoreOrLevel?: StringValue // DisplayScoreFormula()
  }
}

export interface ParentTrait {
  childProfile: `full-cost` | `alternative-attacks` // ChildProfile()
}

//
//
//
//

// "traits-and-modifiers"
export interface TraitOrModifier {
  type: TraitType
  //
  name: string // Name()
  nameExtension?: string // NameExt()
  //
  description: string // Description()
  group: string[] | string // Group()
  //    A modifier can only belong to a single GROUP(), and if an otherwise identical modifier is found in two
  //    different modifier groups, that is two completely different modifiers as far as GCA is concerned
  mods: string[] // Mods()
  notes: {
    short: string[] // Notes()
    large: string[] // UserNotes()
  }
  //
  bonuses: Bonus[] // Conditional(), Gives()
  //
  vars: string // Vars()
}

export interface Trait extends TraitOrModifier {
  hide: BooleanValue // Hide(), HideMe()
  //
  needs: unknown[] // Needs()
  taboos: unknown[] // Taboo()
  //
  reference: string // Page()
  group: string[] // Group()
  capacity?: number // CountCapacity()
  weightCapacity?: number // WeightCapacity()
  weightCapacityUnit?: string // WeightCapacityUnits()
  uses?: number // Uses()
  //
  block: NumericOrDiceValue // BlockAt()
  parry: NumericOrDiceValue // ParryAt()
  modes: Mode[]
  //
  DB: number // DB()
  // DR: number // DR()
  //    since it interacts with Location() differently for equipments, moving from here
  // drNotes: string[] // DRNotes()
  //
  units: string // Units()
}

export interface TraitNonEquipment extends Trait {
  //
  DR: {
    value: number // DR()
    notes: string[] // DRNotes()
  }
}

// advantages
// advantages, cultures, languages, perks, features, disadvantages, quirks, templates, MODIFIERS?????
export interface TraitNonSkillNonSpellNonEquipment extends TraitNonEquipment {
  level: {
    names?: string[] // LevelNames()
    maximum?: number // UpTo() or Cost()
    capAfterBonuses?: boolean // UpTo(X LimitingTotal)
    value: number // [IN POINTS]
  }
}

// advantages, skills, spells
export interface TraitNonAttributeNonEquipment extends TraitNonEquipment {
  //
  cost: {
    progression: number[] // Cost()
    formula?: string // Formula()
    //
    value: number // [IN POINTS]
  }
}

//
//
//
//
//

export interface Mode {
  name: string // Mode(), <attackmode><name /></attackmode>
  //
  // SkillUsed()
  skills: {
    list: string[]
    worstOf?: boolean
  }
  //
  notes: string // ItemNotes()
}

export interface DamageMode extends Mode {
  //
  // Acc()
  acc: {
    value: number
    suffix?: string
  }
  break: number // Break()
  bulk: number // Bulk()
  LC: string // LC()
  ST: {
    minimum: string // MinST()
    basedOn: Nullable<string> // MinSTBasedOn()
  }
  parry: Nullable<number> // Parry() {null for Parry(NO)}
  //
  damage: {
    basedOn: Nullable<string> // DamageBasedOn()
    value: NumericOrDiceValue // Damage()
    type: StringValue<DamageType> // DamType()
    maximum?: NumericOrDiceValue // MaxDam()
  }
  range: {
    half: number | Quantity // RangeHalfDam()
    maximum: number | Quantity // RangeMax()
  }
  recoil?: number // Rcl()
  reach?: {
    value: number | [number, number] // Reach()
    basedOn: Nullable<string> // ReachBasedOn()
  }
  rateOfFire?: number // ROF()
  shots?: number // Shots()
}

//
//
//
//
//

export interface Bonus {
  /**
   * Bonuses granted by Conditional() dont affect final target value, but a message is shown somewhere
   * Gives() changes the target value
   */
  singleBonus?: boolean // single bonus vs per-level basis
  bonus: NumericValue // MATH_ENABLED()
  targets: string[]
  tag?: TagName
  maximum?: NumericValue // upto, MATH_ENABLED()
  description?: string
  reason?: string // SPECIAL_CASE_SUBSTITUTION()
  //
  changeTarget?: boolean // if Conditional() then FALSE
  byMode?: {
    // This optional block allows you to specify that the bonus applies on a per-mode basis and may not be universally applicable to the target
    tag: TagName // MODE_ENABLED tag
    comparison: TraitSelector
    subCriteria?: TraitSelectorSubcriteria
    value: string // value that you're comparing TAG against
  }
}
