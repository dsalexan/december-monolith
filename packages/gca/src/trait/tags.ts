import { MaybeArray } from "tsdef"
import { isArray } from "lodash"

import { TraitSection } from "./section"

export type TagApllication =
  | TraitSection
  | `traits`
  | `traits-with-damage-modes`
  | `modifiers-that-add-new-damage-modes`
  | `parent-traits`
  | `traits-and-modifiers`
  | `traits-other-than-attributes` // as per "Formula()" definition we can infer that this includes EQUIPMENT
  | `skills-and-spells`
  | `system-traits`
  | `system-equipment-traits`
  | `traits-other-than-skills-spells-and-equipment`
export type ExpectedType =
  | `simple-numeric`
  | `simple-suffix-text`
  | `expression`
  | `expression-list`
  | `simple-string`
  | `gurps-dice-notation`
  | `dice-notation`
  | `trait`
  | `trait-list`
  | `full-text-notation`
  | `custom`
  | `slashed-pair`
  | `string-list`
  | `yes-no`
  | `simple-unit-suffix-text`
  | `simple-numeric-range`
  | `rounding-direction`
  | `unit`
  | `progression-simple-numeric`
  | `solver`

export interface TagDefinition {
  appliesTo: TagApllication[]
  expectedTypes: ExpectedType[]
  mathEnabled?: boolean
  modeSpecific?: boolean
  specialCaseSubstitution?: boolean
  textFunctionSolver?: boolean
  flagTag?: boolean
  customExpression?: boolean
}

export const DEFINITION = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo] }
}

export const MATH_ENABLED = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo], mathEnabled: true }
}

export const MODE_SPECIFIC = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo], modeSpecific: true }
}

export const MATH_ENABLED_AND_MODE_SPECIFIC = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return MATH_ENABLED(appliesTo, expectedTypes, { ...definition, modeSpecific: true })
}

export const SPECIAL_CASE_SUBSTITUTION = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo], specialCaseSubstitution: true }
}

export const TEXT_FUNCTION_SOLVER = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo], textFunctionSolver: true }
}

export const FLAG_TAG = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo], flagTag: true }
}

export const CUSTOM_EXPRESSION = (appliesTo: MaybeArray<TagApllication>, expectedTypes: MaybeArray<ExpectedType>, definition: Partial<TagDefinition> = {}): TagDefinition => {
  return { ...definition, expectedTypes: isArray(expectedTypes) ? expectedTypes : [expectedTypes], appliesTo: isArray(appliesTo) ? appliesTo : [appliesTo], customExpression: true }
}

export const TAG_NAMES = [
  `Acc`,
  `AddMode`,
  `AddMods`,
  `Adds`,
  `AddsOrIncreases`,
  `Age`,
  `Appearance`,
  `ArmorDivisor`,
  `Base`,
  `BaseCost`,
  `BaseCostFormula`,
  `BaseQty`,
  `BaseValue`,
  `BaseWeight`,
  `BaseWeightFormula`,
  `BlockAt`,
  `BodyType`,
  `Break`,
  `Bulk`,
  `Cat`,
  `CharHeight`,
  `CharWeight`,
  `ChildOf`,
  `ChildProfile`,
  `Collapse`,
  `CollapseMe`,
  `Conditional`,
  `Cost`,
  `CostFormula`,
  `Count`,
  `CountAsNeed`,
  `CountCapacity`,
  `Creates`,
  `Damage`,
  `DamageBasedOn`,
  `DamageIsText`,
  `DamType`,
  `DB`,
  `Default`,
  `Deflect`,
  `Description`,
  `Display`,
  `DisplayCost`,
  `DisplayName`,
  `DisplayNameFormula`,
  `DisplayScoreFormula`,
  `DisplayWeight`,
  `Down`,
  `DownFormula`,
  `DownTo`,
  `DR`,
  `DRNotes`,
  `Features`,
  `FencingWeapon`,
  `Flexible`,
  `ForceFormula`,
  `Formula`,
  `Fortify`,
  `Gives`,
  `Group`,
  `Hide`,
  `HideMe`,
  `Hides`,
  `Highlight`,
  `HighlightMe`,
  `HitTable`,
  `Ident`,
  `Init`,
  `InitMods`,
  `InPlayMult`,
  `Invisible`,
  `ItemNotes`,
  `LC`,
  `Level`,
  `LevelNames`,
  `Loadout`,
  `Links`,
  `Location`,
  `Locks`,
  `Lockstep`,
  `MainWin`,
  `MaxDam`,
  `MaxScore`,
  `MergeTags`,
  `MinScore`,
  `Message`,
  `MinST`,
  `MinSTBasedOn`,
  `Mitigator`,
  `Mode`,
  `Mods`,
  `Name`,
  `NameExt`,
  `Needs`,
  `NewMode`,
  `Notes`,
  `OptSpec`,
  `Owns`,
  `Page`,
  `ParentOf`,
  `Parry`,
  `ParryAt`,
  `Race`,
  `Radius`,
  `RangeHalfDam`,
  `RangeMax`,
  `Rcl`,
  `Reach`,
  `ReachBasedOn`,
  `RemoveMods`,
  `Removes`,
  `RemovesByTag`,
  `ReplaceTags`,
  `ROF`,
  `Round`,
  `RoundLastOnly`,
  `RoundMods`,
  `ScopeAcc`,
  `Select`,
  `SelectX`,
  `SetLoadout`,
  `Sets`,
  `ShortLevelNames`,
  `ShortName`,
  `Shots`,
  `SkillUsed`,
  `Stat`,
  `STCap`,
  `Step`,
  `SubsFor`,
  `Symbol`,
  `Taboo`,
  `TargetListIncludes`,
  `TechLvl`,
  `Tier`,
  `TL`,
  `Triggers`,
  `Type`,
  `Units`,
  `Up`,
  `UpFormula`,
  `UpTo`,
  `UserNotes`,
  `Uses`,
  `Uses_settings`,
  `Uses_used`,
  `Vars`,
  `VTTNotes`,
  `VTTModeNotes`,
  `WeightCapacity`,
  `WeightCapacityUnits`,
  `WeightFormula`,
  `Where`,
] as const
export type TagName = (typeof TAG_NAMES)[number]

export const TAGS: Record<TagName, TagDefinition> = {
  Acc: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-suffix-text`]),
  // AddMode
  // AddMods
  // Adds
  // AddsOrIncreases
  // Age
  // Appearance
  ArmorDivisor: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-numeric`),
  // Base
  BaseCost: DEFINITION(`equipment`, `simple-numeric`), // The dollar cost of one piece of the equipment. This should always be a simple numeric value.
  BaseCostFormula: DEFINITION(`equipment`, `expression`), // formula to use to determine the base cost of the item before count or children. If used, this replaces the value of the base cost as set by basecost() with the calculated result
  BaseQty: MATH_ENABLED(`equipment`, [`simple-numeric`, `expression`]), //  initial count or quantity of the equipment item when first taken by the user
  BaseValue: MATH_ENABLED(`attributes`, [`simple-numeric`, `expression`]), // initial score of the attribute before the user has changed it
  BaseWeight: DEFINITION(`equipment`, `simple-numeric`), // The weight of one piece of the equipment. This should always be a simple numeric value.
  BaseWeightFormula: DEFINITION(`equipment`, `expression`), // formula to use to determine the base weight of the item before count or children. If used, this replaces the value of the base weight as set by baseweight() with the calculated result
  BlockAt: MATH_ENABLED(`traits`, `expression`), //  specify the normal Block score when using the trait to block
  // BodyType
  Break: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-numeric`), // Break value for the weapon or attack
  Bulk: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-numeric`), // Bulk value for the weapon or attack
  // Cat
  // CharHeight
  // CharWeight
  // ChildOf
  ChildProfile: DEFINITION(`parent-traits`, `simple-numeric`), // child/parent pricing
  // Collapse
  // CollapseMe
  Conditional: CUSTOM_EXPRESSION(`traits-and-modifiers`, `expression-list`),
  Cost: CUSTOM_EXPRESSION([`traits-other-than-attributes`, `skills-and-spells`, `modifiers`], [`simple-numeric`, `simple-string`, `custom`]), // cost OR cost progression of trait (ALSO final dollar cost of equipment)
  //    for TRAITS Cost() also implies the "number of levels" a trait can have (by slashes)
  CostFormula: DEFINITION(`equipment`, `expression`), // something about formula to override overall cost of equipment
  Count: DEFINITION(`equipment`, `simple-numeric`), // number of items in the equipment
  // CountAsNeed
  CountCapacity: DEFINITION(`traits`, `simple-numeric`), // number of child items the item can contain
  // Creates
  Damage: MATH_ENABLED_AND_MODE_SPECIFIC(`traits-with-damage-modes`, `gurps-dice-notation`), // Damage value for the weapon or attack, STANDARD GURPS DAMAGE CODE
  DamageBasedOn: MODE_SPECIFIC(`traits-with-damage-modes`, `trait`), // use the attribute specified within for determining damage for an item or trait
  // DamageIsText
  DamType: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-string`), // Damage type for the weapon or attack
  DB: DEFINITION(`traits`, `simple-numeric`), // Damage Bonus
  Default: CUSTOM_EXPRESSION(`skills-and-spells`, [`expression`, `trait-list`]), // waaaaaay too complex
  // Deflect
  Description: DEFINITION(`traits-and-modifiers`, `full-text-notation`), // full text description of the trait or modifier
  Display: DEFINITION(`attributes`, `simple-numeric`),
  DisplayCost: DEFINITION(`system-traits`, `simple-numeric`), // label to display in place of cost
  DisplayName: DEFINITION(`system-traits`, `simple-string`), // name to display in place of the trait or modifier name
  DisplayNameFormula: TEXT_FUNCTION_SOLVER([`traits`, `modifiers`], `expression`),
  DisplayScoreFormula: CUSTOM_EXPRESSION([`traits`, `modifiers`], `expression`),
  DisplayWeight: DEFINITION(`system-equipment-traits`, `simple-numeric`), // label to display in place of weight
  Down: DEFINITION(`attributes`, [`progression-simple-numeric`]), // cost for each step decremented below the base value of the attribute (fixed or progression)
  DownFormula: DEFINITION(`attributes`, `expression`), // for calculating the cost of the attribute when lowering the attribute from the base value
  // DownTo
  DR: DEFINITION(`traits`, [`simple-numeric`, `simple-suffix-text`, `slashed-pair`]), // Damage Resistance
  DRNotes: DEFINITION(`traits`, `string-list`), // notes about the DR, each note should be an individual item, and multiple notes should be separated by commas
  // Features
  // FencingWeapon
  // Flexible
  ForceFormula: FLAG_TAG(`modifiers`, `yes-no`), // forces Formula() to be used in ALL cost calculations, not just those beyond the costs specified in the definition (basically ignore fixed or progression cost)
  Formula: DEFINITION([`traits-other-than-attributes`, `skills-and-spells`, `modifiers`], `expression`), // expression to determine cost of a trait
  // Fortify
  Gives: CUSTOM_EXPRESSION(`traits-and-modifiers`, [`expression`, `custom`]), // list of traits that are given by the trait or modifier
  Group: DEFINITION(`traits-and-modifiers`, [`string-list`]), // basically groups a trait under a new alias
  Hide: FLAG_TAG(`traits`, `yes-no`), // hide the trait from the user
  HideMe: CUSTOM_EXPRESSION(`traits`, [`expression`, `simple-numeric`]), // Solver is used to return a numeric result. If zero, HIDE() is removed, otherwise HIDE(YES) is added to the trait
  // Hides
  // Highlight
  // HighlightMe
  // HitTable
  // Ident
  // Init
  // InitMods
  // InPlayMult
  // Invisible
  ItemNotes: MODE_SPECIFIC(`traits`, `string-list`), // mode-enabled (???, should be mode-specific?), list of notes about each mode in trait
  LC: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-string`), // LC value of weapon or attack
  // Level
  LevelNames: DEFINITION(`traits-other-than-skills-spells-and-equipment`, [`string-list`, `custom`]), // list of names for each level of the trait
  // Loadout
  // Links
  Location: DEFINITION(`equipment`, `string-list`), // list of locations where the equipment can be worn or carried, this also behaves as a list
  // Locks
  // Lockstep
  // MainWin
  MaxDam: CUSTOM_EXPRESSION(`traits-with-damage-modes`, [`expression`, `gurps-dice-notation`]), // maximum damage for damage mode
  MaxScore: MATH_ENABLED(`attributes`, [`simple-numeric`]), // has LimitingTotal
  // MergeTags
  MinScore: MATH_ENABLED(`attributes`, `simple-numeric`), // has LimitingTotal
  // Message
  MinST: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-suffix-text`]), // minimum ST required to use the weapon or attack w/o penalties
  MinSTBasedOn: MODE_SPECIFIC(`traits-with-damage-modes`, [`trait`]), // trait to use in MinSt (instead of ST:Striking ST)
  // Mitigator
  // Mode {actually <attackmode><name /></attackmode>}
  Mods: DEFINITION(`traits-and-modifiers`, [`string-list`]), // specifies a list of modifier groups that are applicable to the trait or modifier ???????? wtf
  Name: DEFINITION(`traits-and-modifiers`, `simple-string`), // name of the trait or modifier
  NameExt: DEFINITION(`traits-and-modifiers`, `simple-string`), // name extension for the trait or modifier
  Needs: CUSTOM_EXPRESSION(`traits`, [`custom`, `expression`]), // list of prerequisites for the trait
  // NewMode
  Notes: DEFINITION(`traits`, `simple-string`),
  // OptSpec
  // Owns
  Page: DEFINITION(`traits-and-modifiers`, `simple-string`), // page reference for thing
  // ParentOf
  Parry: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-suffix-text`]), // parry ADJUSMENT for weapon or attack
  ParryAt: MATH_ENABLED(`traits`, `expression`), // specify the normal Parry score when using the trait to parry
  // Race
  // Radius
  RangeHalfDam: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-unit-suffix-text`]), // half-damage range of an attack or other effect
  RangeMax: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-unit-suffix-text`]), // maximum range of an attack or other effect
  Rcl: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-numeric`), // recoil
  Reach: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-numeric-range`]),
  ReachBasedOn: MODE_SPECIFIC(`traits-with-damage-modes`, `trait`), // attribute, like ST:Neck Reach or ST:Arm Reach
  // RemoveMods
  // Removes
  // RemovesByTag
  // ReplaceTags
  ROF: MODE_SPECIFIC(`traits-with-damage-modes`, `simple-numeric`), // rate of fire
  Round: MATH_ENABLED([`attributes`, `modifiers`], `rounding-direction`), // how to round attribute score
  // RoundLastOnly
  // RoundMods
  // ScopeAcc
  // Select
  // SelectX
  // SetLoadout
  // Sets
  // ShortLevelNames
  ShortName: DEFINITION(`modifiers`, `simple-string`), // short name of the modifier
  Shots: MODE_SPECIFIC(`traits-with-damage-modes`, [`simple-numeric`, `simple-suffix-text`]), // number of shots for an attack ????
  SkillUsed: MODE_SPECIFIC(`traits`, [`trait-list`, `expression-list`, `custom`]), // list possible traits to use for a "skill roll" in trait
  //    anecdotally, this is used for "default" skills in modes (even non-damaging ones)
  // Stat
  // STCap
  Step: MATH_ENABLED(`attributes`, `simple-numeric`), // step for upgrading/downgrading attribute score by one "UNIT OF COST"
  // SubsFor
  Symbol: DEFINITION(`attributes`, `simple-string`), // alternative name for use in calculations (only supported in math expressions)
  Taboo: DEFINITION(`traits`, [`custom`, `expression`]), // specify taboo items for the trait, same basic features as Needs()
  // TargetListIncludes
  TechLvl: DEFINITION(`equipment`, [`simple-numeric`, `custom`]), // minimum available tech level for the equipment
  Tier: DEFINITION(`modifiers`, `simple-numeric`), // from -2 to +2, it determiners the order in which modifiers are computed
  TL: DEFINITION(`traits`, [`simple-numeric`, `simple-numeric-range`]), // TL for trait, can be derived from character's TL
  // Triggers
  Type: DEFINITION(`skills-and-spells`, `simple-string`), // check SkillTypes
  Units: DEFINITION(`traits`, `unit`), // specify unit for "PRIMARY VALUE" of trait (like weight for equipment)
  Up: DEFINITION(`attributes`, `progression-simple-numeric`), // cost for each step incremented above the base value of the attribute
  UpFormula: MATH_ENABLED(`attributes`, `expression`),
  UpTo: MATH_ENABLED(`traits`, `custom`), // maximum number of levels allowed for trait
  UserNotes: DEFINITION(`traits`, `full-text-notation`), // user notes, LARGE info (for short form, use Nodes())
  Uses: MODE_SPECIFIC(`traits`, [`solver`, `simple-numeric`]), // number of uses for trait
  // Uses_settings
  // Uses_used
  Vars: DEFINITION(`traits`, `custom`),
  // VTTNotes
  // VTTModeNotes
  WeightCapacity: DEFINITION(`traits`, `simple-numeric`), // weight capacity of the item
  WeightCapacityUnits: DEFINITION(`traits`, `unit`), // unit for weight capacity
  WeightFormula: DEFINITION(`equipment`, `expression`),
  Where: DEFINITION(`equipment`, `simple-string`), // fluff for "Where It's Kept" on character
} as Record<TagName, TagDefinition>
