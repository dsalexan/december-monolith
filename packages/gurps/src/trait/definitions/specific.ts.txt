import { NumericValue, ObjectValue, QuantityValue } from "@december/tree/interpreter"

import { Trait, TraitNonAttributeNonEquipment, TraitOrModifier } from "./generic"

export type BodyLocation = `neck` | `full suit`

export interface Equipment extends Trait {
  type: `equipment`
  //
  count: number // Count()
  maximumCount?: number // UpTo() {maximum item count allowed for equipment}
  base: {
    cost: NumericValue // BaseCost(), BaseCostFormula()
    quantity: NumericValue // BaseQty()
    weight: NumericValue // BaseWeight(), BaseWeightFormula()
  }
  weight: QuantityValue // WeightFormula()
  cost: NumericValue // Cost() [dollar amount], Formula()/CostFormula() [overrides base calculation]
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
  minimumTechLevel?: number // TechLevel() {first TL at which equipment becomes available}
  techLevel?: number // TL()
}

export interface SystemEquipment {
  display?: {
    weight?: string // DisplayWeight()
  }
}

export interface Attribute extends Trait {
  type: `attribute`
  //
  symbol?: string // Symbol()
  display?: number // Display()
  //
  cost: {
    decrement: number[] // Down() or DownFormula()
    increment: number[] // Up() or UpFormula()
  }
  score: {
    base: NumericValue // BaseValue()
    minimum?: NumericValue // MinScore()
    maximum?: NumericValue // MaxScore()
    capAfterBonus?: boolean // MaxScore(), LimitingTotal
    round?: `up` | `down` | `none` // Round()
    step?: number // Step()
    //
    value: number // [IN LEVEL UNITS]
  }
}

export interface SkillAndSpells extends TraitNonAttributeNonEquipment {
  type: `skill` | `spell` | `technique`
  //
  defaults: string[] // list of traits, Default()
  difficulty: `easy` | `average` | `hard` | `very hard` // Type()
  level: {
    maximum?: number // UpTo() or Cost()
    pointCap?: number // UpTo(X[pts])
    //
    value: number // [IN POINTS]
  }
}

// MODIFIER DOES NOT EXTENDS TRAIT
export interface Modifier extends TraitOrModifier {
  type: `modifier`
  //
  shortName: string // ShortName()
  group: string // Group()
  //    A modifier can only belong to a single GROUP(), and if an otherwise identical modifier is found in two
  //    different modifier groups, that is two completely different modifiers as far as GCA is concerned
  //
  cost: {
    steps: number[] // Cost()
    formula?: string // CostFormula()
    forceFormula?: boolean // ForceFormula() {force calculation by FORMULA ONLY, not just after steps end}
    //
    value: number // [IN POINTS]
  }
  level: {
    maximum?: number // UpTo()
    capAfterBonuses?: boolean // UpTo(X LimitingTotal)
    //
    value: number // [IN POINTS]
  }
  //
  tier?: number // Tier()
}

//
//
//
//
//
//

export interface SkillType {
  name: string
  costs: number[] // difference between last two steps defines out of table progression
  base: number // amount subtracted from the BASE SCORE of related attribute
  defaultAttribute: string
  // adds: number // always ONE i think
  // relName: string // NO NEED, derive from default attribute
  // zeroPointsOkay: boolean // some technique tecnicalities
  // subzero: number // some technique tecnicalities
}
