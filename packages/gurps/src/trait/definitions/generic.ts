import { Nullable } from "tsdef"

import { BooleanValue, NumericValue, ObjectValue, RuntimeValue, StringValue } from "@december/tree/interpreter"
import { NumericOrDiceValue, DiceRollValue, DiceNotationValue } from "@december/system/dice"
import { Quantity } from "@december/utils/unit"
import { TagName } from "@december/gca/trait"

import { TraitType } from "../type"
import { DamageType } from "../../mechanics/damage/type"
import { LevelCost, MonetaryCost, ProgressionCost, StepCost, TraitCost } from "./cost"
import { TraitTagParsedValue } from "../../../../../apps/gca/src/trait/tag/value"
import { TraitReference } from "../../utils"

// #region GENERICS

// traits-and-modifiers
export interface IGURPSTraitOrModifier<TType extends TraitType = TraitType> {
  type: TType
  //
  name: string // Name()
  nameExtension?: string // NameExt()
  description?: string // Description()
  //
  reference: Nullable<TraitReference[]> // Page()
  //
  group?: string // Group()
  mods?: string[] // Mods()
  //
  // GCABase
  // //
  // conditional: MaybeUndefined<string> // Conditional()
  // description: MaybeUndefined<string> // Description()
  // displayNameFormula: MaybeUndefined<string> // DisplayNameFormula()
  // displayScoreFormula: MaybeUndefined<string> // DisplayScoreFormula()
  // //
  // childKeyList: MaybeUndefined<string> // childkeylist
  // _inactive: boolean // extended.extendedtag.inactive
}

// traits
export interface IGURPSBaseTrait<TType extends Exclude<TraitType, `modifier`> = Exclude<TraitType, `modifier`>> extends IGURPSTraitOrModifier {
  type: TType
  cost: TraitCost // (check extensions)
  //
  notes?: {
    short?: string[] // ItemNotes()
    long?: string[] // UserNotes()
  }
  //
  modes: unknown[]
  modifiers: unknown[]
  //
  // GCABaseTrait
  // //
  // // parent-traits
  // childProfile: MaybeUndefined<number> // ChildProfile()
  // // system-traits
  // displayCost: MaybeUndefined<number> // DisplayCost()
  // displayName: MaybeUndefined<string> // DisplayName()
  // //
  // blockAt: MaybeUndefined<string> // BlockAt()
  // countCapacity: MaybeUndefined<number> // CountCapacity()
  // db: MaybeUndefined<number> // DB()
  // dr: MaybeUndefined<string> // DR()
  // drNotes: MaybeUndefined<string> // DRNotes()
  // hide: MaybeUndefined<boolean> // Hide()
  // hideMe: MaybeUndefined<string> // HideMe()
  // needs: MaybeUndefined<string> // Needs()
  // parryAt: MaybeUndefined<string> // ParryAt()
  // skillUsed: MaybeUndefined<string> // SkillUsed()
  // taboo: MaybeUndefined<string> // Taboo()
  // tl: MaybeUndefined<string> // TL()
  // units: MaybeUndefined<string> // Units()
  // upTo: MaybeUndefined<string> // UpTo()
  // uses: MaybeUndefined<number> // Uses()
  // vars: MaybeUndefined<string> // Vars()
  // weightCapacity: MaybeUndefined<number> // WeightCapacity()
  // weightCapacityUnits: MaybeUndefined<string> // WeightCapacityUnits()
  // //
  // _sysLevels: MaybeUndefined<number> // calcs.syslevels; levels from bonuses, not FREE levels from system
}

// #endregion

// #region SPECIFICS

export interface IGURPSAttribute extends IGURPSBaseTrait<`attribute`> {
  score: {
    base: {
      source: string // calcs.basescore OR BaseValue() — expression to derive baseScoreValue from
      value: number // calcs.basescore — base for to calculate final score from
    }
    minimum?: {
      expression: string // MinScore()
      value: number
    }
    //
    value: number // score — final score of attribute (semantics for "level")
  }
  points: {
    base: number // calcs.basepoints — initial input of points by player
  }
  cost: StepCost // Down(), DownFormula(), Up, Step()
  //
  symbol?: string // Symbol()
  //
  // GCAAttribute
  // //
  // display: MaybeUndefined<string> // Display()
  // //
  // _baseScore: MaybeUndefined<number> // calcs.basescore; !fetch value from baseValue instead of using this
  // _score: MaybeUndefined<number> // calcs.score; !calculate from baseScore + sysLevels + modifiers maybe
}

export interface IGURPSSkillOrSpellOrTechnique extends IGURPSBaseTrait<`skill` | `spell` | `technique`> {
  level: {
    // Default()
    defaults: Nullable<
      {
        expression: string // expression to calculate both LEVEL and DISPLAY
        //
        trait: string // reference of trait responsible for default
        level: number // default value
      }[]
    >
    //
    value: number // level — final level for invested points
  }
  points: {
    base: number // calcs.basepoints — initial input of points by player
  }
  cost: ProgressionCost // Down(), DownFormula(), Up, Step()
  // attribute: string // ONLY FOR SKILLS/SPELLS, not techniques
  difficulty: `E` | `A` | `H` | `VH` // Type()
  //
  // GCASkillOrSpell
  // //
  // round: MaybeUndefined<number> // Round()
  // //
  // childPoints: MaybeUndefined<number> // calcs.childpoints
}

export const BODY_LOCATIONS = [`neck`, `full suit`] as const
export type BodyLocation = (typeof BODY_LOCATIONS)[number]

export interface IGURPSEquipment extends IGURPSBaseTrait<`equipment`> {
  count: {
    base: number // BaseQty() — initial quantity by default
    maximum?: number // UpTo() {maximum item count allowed for equipment}
    //
    value: number // Count() — input by player
  }
  //
  cost: MonetaryCost // BaseCostFormula(), BaseCost(), Formula(), CostFormula()
  //
  weight: {
    unitaryExpression?: string | number // BaseWeightFormula()
    unitary: number // BaseWeight() — initial weight by default or calculated by unitaryExpression
    //
    expression?: string // WeightFormula()
    value: number // base weight * count or calcualted by expression
  }
  //
  location: Record<
    BodyLocation | `default`,
    {
      DR: {
        value: number // DR()
        notes: string[] // DRNotes()
      }
    }
  > // Location()
  whereItIsKept?: string // Where()
  //
  minimumTechLevel?: string // TechLevel() {first TL at which equipment becomes available}
  techLevel?: string // TL()
  //
  // GCAEquipment
  // //
  // // system-equipment-traits
  // displayWeight: MaybeUndefined<number> // DisplayWeight()
  // //
}

export interface IGURPSModifier extends IGURPSTraitOrModifier<`modifier`> {
  shortName?: string // ShortName()
  //
  level: {
    names?: string[] // LevelNames()
    value: number // level — initial input of levels by player
  }
  modifier: {
    display: string // Cost()*, ForceFormula() — display for cost, usually same as Cost() (except when ForceFormla() exists)
    //
    progression?: string // Cost(), ForceFormula() — usually progression to determine modifier value
    expression?: string // Formula(), ForceFormula() — expression to determine modifier value AFTER progression
    //
    type: `integer` | `percentage` | `multiplier` // type of modifier, a integer summ/subtraction OR a multiplier
    value: number // value — final value of modifier
  }
  //
  // GCAModifier
  // //
  // round: MaybeUndefined<number> // Round()
  // tier: MaybeUndefined<number> // Tier()
}

export interface IGURPSGeneralTrait<TType extends Exclude<TraitType, `attribute` | `skill` | `spell` | `equipment` | `modifier`> = Exclude<TraitType, `attribute` | `skill` | `spell` | `equipment` | `modifier`>>
  extends IGURPSTraitOrModifier<TType> {
  level: {
    names?: string[] // LevelNames()
    base: number // calcs.baselevel — initial input of levels by player
  }
  points: {
    value: number // points — final cost in points
  }
  cost: LevelCost // Cost(), Formula()
  //
  // GCABaseNonAttribute
}

// #endregion

export type IGURPSTrait = IGURPSAttribute | IGURPSSkillOrSpellOrTechnique | IGURPSEquipment | IGURPSGeneralTrait
