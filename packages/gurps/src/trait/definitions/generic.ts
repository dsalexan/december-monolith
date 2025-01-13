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
import { Get, MergeDeep } from "type-fest"

// #region GENERICS

// traits-and-modifiers
export interface IGURPSTraitOrModifier<TType extends TraitType = TraitType> {
  id: string
  type: TType
  children: string[] // childkeylist — list of children traits by id
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
  // _inactive: boolean // extended.extendedtag.inactive
}

// traits
export interface IGURPSBaseTrait<TType extends Exclude<TraitType, `modifier`> = Exclude<TraitType, `modifier`>> extends IGURPSTraitOrModifier {
  type: TType
  cost: TraitCost // (check extensions)
  //
  // parent-traits
  childProfile: `regular` | `alternative-attacks` | `apply-modifiers-to-children` // ChildProfile()
  /**
   * If this tag is missing or has a value of 0, the normal behavior applies (the full costs of the child traits are included in the total cost of
   * the parent trait.) If this tag has a value of 1, the child traits are treated as Alternative Attacks (p. B61), and their costs are adjusted
   * appropriately before being included in the total cost of the parent trait.
   */
  //
  notes?: {
    short?: string[] // ItemNotes()
    long?: string[] // UserNotes()
  }
  //
  modes: unknown[]
  modifiers: IGURPSModifier[]
  //
  radius: number // owner::radius
  //
  // GCABaseTrait
  // //
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

export interface IGURPSPointsBasedTrait {
  points: {
    value: number // points — final cost in points
  }
}

export interface IGURPSLevelBasedTraitOrModifier {
  level: {
    value: number // level — final level for invested points
  }
}

// #endregion

// #region SPECIFICS

export interface IGURPSAttribute extends IGURPSBaseTrait<`attribute`>, IGURPSPointsBasedTrait, IGURPSLevelBasedTraitOrModifier {
  score: {
    base: {
      source: string // calcs.basescore OR BaseValue() — expression to derive initial score from
      initial: number // value from calcs.basescore OR BaseValue()
      value: number // calcs.basescore — base for to calculate final score from; same as BASE_SCORE = INITIAL_SCORE + BOUGHT_SCORE
    }
    minimum?: {
      expression: string // MinScore()
      value: number
    }
    //
    value: number // score — final score of attribute (semantics for "level")
  }
  points: MergeDeep<
    IGURPSPointsBasedTrait[`points`],
    {
      base: number // calcs.basepoints — initial input of points by player
    }
  >
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

export interface IGURPSSkillOrSpellOrTechnique extends IGURPSBaseTrait<`skill` | `spell` | `technique`>, IGURPSPointsBasedTrait, IGURPSLevelBasedTraitOrModifier {
  level: MergeDeep<
    IGURPSLevelBasedTraitOrModifier[`level`],
    {
      // Default()
      defaults: Nullable<
        {
          expression: string // expression to calculate both LEVEL and DISPLAY
          //
          trait: string // reference of trait responsible for default
          level: number // default value
        }[]
      >
    }
  >
  points: MergeDeep<
    IGURPSPointsBasedTrait[`points`],
    {
      base: number // calcs.basepoints — initial input of points by player
    }
  >
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

export interface IGURPSModifier extends IGURPSTraitOrModifier<`modifier`>, IGURPSLevelBasedTraitOrModifier {
  shortName?: string // ShortName()
  //
  level: MergeDeep<
    IGURPSLevelBasedTraitOrModifier[`level`],
    {
      names?: string[] // LevelNames()
    }
  >
  modifier: {
    display: string // Cost()*, ForceFormula() — display for cost, usually same as Cost() (except when ForceFormla() exists)
    //
    progression?: string // Cost(), ForceFormula() — usually progression to determine modifier value
    expression?: string // Formula(), ForceFormula() — expression to determine modifier value AFTER progression
    type: `integer` | `percentage` | `multiplier` // type of modifier, a integer sum/subtraction OR a multiplier (implied from Cost())
    round: `up` | `down` | `none` // Round()
    //
    value: number // value — final value of modifier
  }
  //
  // GCAModifier
  // //
  // round: MaybeUndefined<number> // Round()
  // tier: MaybeUndefined<number> // Tier()
}

export interface IGURPSGeneralTrait<TType extends Exclude<TraitType, `attribute` | `skill` | `spell` | `equipment` | `modifier`> = Exclude<TraitType, `attribute` | `skill` | `spell` | `equipment` | `modifier`>>
  extends IGURPSBaseTrait<TType>,
    IGURPSPointsBasedTrait,
    IGURPSLevelBasedTraitOrModifier {
  level: MergeDeep<
    IGURPSLevelBasedTraitOrModifier[`level`],
    {
      names?: string[] // LevelNames()
      base: number // calcs.baselevel — initial input of levels by player
    }
  >
  cost: LevelCost // Cost(), Formula()
  //
  // GCABaseNonAttribute
}

// #endregion

export type IGURPSTrait = IGURPSAttribute | IGURPSSkillOrSpellOrTechnique | IGURPSEquipment | IGURPSGeneralTrait

export type points = Get<IGURPSEquipment, `points.value`>
//            ^?
export type points1 = Get<Exclude<IGURPSTrait, IGURPSEquipment>, `points.value`>
//            ^?

export type level = Get<IGURPSTrait | IGURPSModifier, `level.value`>
//            ^?
export type level1 = Get<Exclude<IGURPSTrait, IGURPSAttribute | IGURPSEquipment> | IGURPSModifier, `level.value`>
//            ^?

export type score = Get<IGURPSTrait, `score.value`>
//            ^?
export type score1 = Get<IGURPSAttribute, `score.value`>
//            ^?

export type modifiers = Get<IGURPSBaseTrait, `modifiers`>
//            ^?
