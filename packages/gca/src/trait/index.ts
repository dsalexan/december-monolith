import { AnyObject, MaybeArray, MaybeUndefined, Nullable } from "tsdef"

import { TraitSection } from "./section"
import { TagApllication } from "./tags"
import assert from "assert"
import { isString } from "lodash"

export { TRAIT_SECTIONS } from "./section"
export type { TraitSection } from "./section"

export type { TagName, ExpectedType, TagApllication, TagDefinition } from "./tags"
export { TAGS, TAG_NAMES } from "./tags"

// trait or modifier
export interface GCABase<TSection extends TraitSection = TraitSection> {
  _raw: AnyObject
  section: TSection
  id: number // IDKey()
  //
  conditional: MaybeUndefined<string> // Conditional()
  description: MaybeUndefined<string> // Description()
  displayNameFormula: MaybeUndefined<string> // DisplayNameFormula()
  displayScoreFormula: MaybeUndefined<string> // DisplayScoreFormula()
  gives: MaybeUndefined<string> // Gives()
  group: MaybeUndefined<string> // Group()
  mods: MaybeUndefined<string> // Mods()
  name: string // Name()
  nameExt: MaybeUndefined<string> // NameExt()
  page: MaybeUndefined<string> // Page()
  //
  childKeyList: MaybeUndefined<string> // childkeylist
  _inactive: boolean // extended.extendedtag.inactive
}

export interface GCABaseTrait<TSection extends TraitSection = TraitSection> extends GCABase<TSection> {
  // parent-traits
  childProfile: MaybeUndefined<number> // ChildProfile()
  // system-traits
  displayCost: MaybeUndefined<number> // DisplayCost()
  displayName: MaybeUndefined<string> // DisplayName()
  // traits-with-damage-modes
  modes: GCAMode[]
  //
  section: Exclude<TraitSection, `modifiers`> & TSection
  //
  blockAt: MaybeUndefined<string> // BlockAt()
  countCapacity: MaybeUndefined<number> // CountCapacity()
  db: MaybeUndefined<number> // DB()
  dr: MaybeUndefined<string> // DR()
  drNotes: MaybeUndefined<string> // DRNotes()
  hide: MaybeUndefined<boolean> // Hide()
  hideMe: MaybeUndefined<string> // HideMe()
  itemNotes: MaybeUndefined<string> // ItemNotes()
  needs: MaybeUndefined<string> // Needs()
  parryAt: MaybeUndefined<string> // ParryAt()
  skillUsed: MaybeUndefined<string> // SkillUsed()
  taboo: MaybeUndefined<string> // Taboo()
  tl: MaybeUndefined<string> // TL()
  units: MaybeUndefined<string> // Units()
  upTo: MaybeUndefined<string> // UpTo()
  userNotes: MaybeUndefined<string> // UserNotes()
  uses: MaybeUndefined<number> // Uses()
  vars: MaybeUndefined<string> // Vars()
  weightCapacity: MaybeUndefined<number> // WeightCapacity()
  weightCapacityUnits: MaybeUndefined<string> // WeightCapacityUnits()
  //
  modifiers: GCAModifier[] // Modifiers()
  //
  _sysLevels: MaybeUndefined<number> // calcs.syslevels; levels from bonuses, not FREE levels from system
}

export interface GCABaseNonAttribute extends GCABase {
  section: Exclude<GCABase[`section`], `attributes`>
  //
  cost: MaybeUndefined<string> // Cost()
  formula: MaybeUndefined<string> // Formula()
  //
  baseLevel: MaybeUndefined<number> // calcs.baselevel; The base level (based on base points for skills and spells), to which bonuses are added. This is Calculated for skills and spells.
}

export interface GCABaseNonSkillNonSpellNonEquipment extends GCABase {
  section: Exclude<GCABase[`section`], `skills` | `spells` | `equipment`>
  //
  levelNames: MaybeUndefined<string> // LevelNames()
}

export interface GCABaseTraitPointBased extends GCABaseTrait {
  basePoints: number // calcs.basepoints
  childPoints: MaybeUndefined<number> // calcs.childpoints
}

//
//
//
//
//

export interface GCAEquipment extends GCABaseTrait, GCABaseNonAttribute {
  // system-equipment-traits
  displayWeight: MaybeUndefined<number> // DisplayWeight()
  //
  section: `equipment`
  //
  baseCost: MaybeUndefined<number> // BaseCost()
  baseCostFormula: MaybeUndefined<string> // BaseCostFormula()
  baseQty: MaybeUndefined<string> // BaseQty()
  baseWeight: MaybeUndefined<number> // BaseWeight()
  baseWeightFormula: MaybeUndefined<string> // BaseWeightFormula()
  costFormula: MaybeUndefined<string> // CostFormula
  count: MaybeUndefined<number> // Count()
  location: MaybeUndefined<string> // Location()
  techLevel: MaybeUndefined<string> // TL()
  weightFormula: MaybeUndefined<string> // WeightFormula()
  where: MaybeUndefined<string> // Where()
  //
  childrencosts: MaybeUndefined<string> // calcs.childrencosts
  childrenweights: MaybeUndefined<string> // calcs.childrenweights
}

export interface GCAAttribute extends GCABaseTrait, GCABaseNonSkillNonSpellNonEquipment, GCABaseTraitPointBased {
  section: `attributes`
  //
  baseValue: MaybeUndefined<string> // BaseValue(); source of baseScore, be that numeric or alias or expression
  display: MaybeUndefined<string> // Display()
  down: MaybeUndefined<string> // Down()
  downFormula: MaybeUndefined<string> // DownFormula()
  maxScore: MaybeUndefined<string> // MaxScore()
  minScore: MaybeUndefined<string> // MinScore()
  round: MaybeUndefined<number> // Round()
  step: MaybeUndefined<number> // Step()
  symbol: MaybeUndefined<string> // Symbol()
  up: MaybeUndefined<string> // Up()
  //
  _baseScore: MaybeUndefined<number> // calcs.basescore; !fetch value from baseValue instead of using this
  _score: MaybeUndefined<number> // calcs.score; !calculate from baseScore + sysLevels + modifiers maybe
}

export interface GCASkillOrSpell extends GCABaseTrait, GCABaseNonAttribute, GCABaseTraitPointBased {
  section: `skills` | `spells`
  //
  default: MaybeUndefined<string> // Default()
  round: MaybeUndefined<number> // Round()
  type: string // Type()
  //
  basePoints: number // calcs.basepoints
  childPoints: MaybeUndefined<number> // calcs.childpoints
}

export interface GCAModifier extends GCABaseNonAttribute, GCABaseNonSkillNonSpellNonEquipment {
  section: `modifiers`
  //
  forceFormula: MaybeUndefined<boolean> // ForceFormula()
  round: MaybeUndefined<number> // Round()
  shortName: MaybeUndefined<string> // ShortName()
  tier: MaybeUndefined<number> // Tier()
  upTo: MaybeUndefined<string> // UpTo()
  //
  level: number // level — level of modifier
  _value: string // value
}

// general traits are LEVEL-BASED
export interface GCAGeneralTrait extends GCABaseTrait, GCABaseNonAttribute, GCABaseNonSkillNonSpellNonEquipment {
  section: Exclude<GCABase[`section`], `attributes` | `skills` | `spells` | `equipment` | `modifiers`>
}

export type GCATrait = GCAAttribute | GCASkillOrSpell | GCAEquipment | GCAGeneralTrait

//
//
//
//
//
//

export interface GCAMode {
  name: string // Mode(), <attackmode><name /></attackmode>
  skillUsed: MaybeUndefined<string> // SkillUsed()
}

export interface GCADamageMode extends GCAMode {
  acc: MaybeUndefined<string> // Acc()
  armorDivisor: MaybeUndefined<number> // ArmorDivisor()
  break: MaybeUndefined<number> // Break()
  bulk: MaybeUndefined<number> // Bulk()
  damage: MaybeUndefined<string> // Damage()
  damageBasedOn: MaybeUndefined<string> // DamageBasedOn()
  damType: MaybeUndefined<string> // DamType()
  lc: MaybeUndefined<string> // LC()
  maxDam: MaybeUndefined<string> // MaxDam()
  minST: MaybeUndefined<string> // MinST()
  minSTBasedOn: MaybeUndefined<string> // MinSTBasedOn()
  parry: MaybeUndefined<string> // Parry()
  rangeHalfDam: MaybeUndefined<string> // RangeHalfDam()
  rangeMax: MaybeUndefined<string> // RangeMax()
  rcl: MaybeUndefined<Nullable<number>> // Rcl()
  reach: MaybeUndefined<string> // Reach()
  reachBasedOn: MaybeUndefined<string> // ReachBasedOn()
  rof: MaybeUndefined<Nullable<number>> // ROF()
  shots: MaybeUndefined<string> // Shots()
}

//
//
//
//
//

/** Check if trait is general (i.e. lacks a specific data structure) */
export function isGeneralTrait(section: TraitSection): boolean {
  return section !== `attributes` && section !== `skills` && section !== `spells` && section !== `equipment` && section !== `modifiers`
}

/** Check if section is applicable */
export function isApplicable(section: TraitSection, applications: MaybeArray<TagApllication>): boolean {
  const _applications = Array.isArray(applications) ? applications : [applications]

  if (_applications.includes(section)) return true

  assert(_applications.length === 1, `Multiple applications not supported yet`)

  const [application] = _applications

  if (application === `traits-other-than-attributes`) return section !== `attributes`
  else if (application === `skills-and-spells`) return section === `skills` || section === `spells`
  else if (application === `traits-other-than-skills-spells-and-equipment`) return section !== `skills` && section !== `spells` && section !== `equipment`

  throw new Error(`Unimplemented relationship between ${section} and ${applications}`)
}

/** Check if damage or mode qualifies a Damage Mode */
export function isDamageMode(damage: MaybeUndefined<string>): boolean
export function isDamageMode(mode: GCAMode | GCADamageMode): mode is GCADamageMode
export function isDamageMode(damageOrMode: MaybeUndefined<string> | GCAMode | GCADamageMode): boolean {
  if (typeof damageOrMode === `string`) return true
  if (damageOrMode === undefined) return false
  if (`damage` in damageOrMode && isString(damageOrMode.damage)) return true

  return false
}
