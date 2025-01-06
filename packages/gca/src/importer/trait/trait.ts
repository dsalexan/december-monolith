import { leftOperand } from "./../../../../tree/src2/nrs_OLD/rule/index"
import { AnyObject, DiffObjects, MaybeUndefined, Nilable, Nullable } from "tsdef"
import assert from "assert"
import { has, isArray, isNil, isNumber, isObjectLike, isString } from "lodash"

import { conditionalSet, isNilOrEmpty, typing } from "@december/utils"
import { getAliases, isNameExtensionValid, Type } from "@december/gurps/trait"
import { dump } from "@december/utils"

import churchill, { Builder, paint, Block } from "../../logger"

import {
  GCAAttribute,
  GCABase,
  GCABaseTrait,
  GCAEquipment,
  GCATrait,
  TagName,
  GCAGeneralTrait,
  GCAModifier,
  GCASkillOrSpell,
  GCAMode,
  isDamageMode,
  GCADamageMode,
  GCABaseNonAttribute,
  GCABaseNonSkillNonSpellNonEquipment,
  GCABaseTraitPointBased,
  isGeneralTrait,
} from "../../trait"
import { TRAIT_SECTIONS, TraitSection } from "../../trait/section"
import { getProgressionIndex, getProgressionStep } from "../../utils/progression"

export function importGCATrait(superType: `trait` | `attribute`, raw: AnyObject, logger?: Builder): GCATrait {
  // 1. Always start with ID, NAME and SECTION (always must have values)
  const id = parseInt(raw.$.idkey, true)
  const name = parseString(raw.name[0], true)
  const section = parseString(raw.$.type, true).toLowerCase() as TraitSection
  assert(TRAIT_SECTIONS.includes(section), `Trait section "${section}" is not valid`)

  // 2. Get NAME EXTENSION for debug
  const _nameExt: MaybeUndefined<string> = raw.nameext?.[0]
  const nameExt = isNameExtensionValid(_nameExt) ? _nameExt : undefined

  if (logger) {
    logger.add(...paint.grey(paint.dim(`[${superType}s/`), id, paint.dim(`] `)), paint.white(name)) // COMMENT
    if (nameExt) logger.add(paint.dim(` (${nameExt})`)) // COMMENT

    const _aliases = getAliases(Type.fromGCASection(section), name, nameExt) // COMMENT
    if (_aliases.length > 0) logger.add(paint.gray.dim(` [${_aliases.join(`, `)}]`)) // COMMENT

    logger.debug() // COMMENT

    const ref: AnyObject = raw.ref?.[0] ?? {}
    const extended: AnyObject[] = raw.extended?.[0]?.extendedtag ?? []
    const calcs: AnyObject = raw.calcs?.[0] ?? {}

    // logger.addRow(`debug`, ...dump(raw))
    // logger.addRow(`debug`, ...dump(ref))
    // logger.addRow(`debug`, ...dump(extended))
    logger.addRow(`debug`, ...dump(calcs))
  }

  // 3. Parse most keys
  assert(section !== `modifiers`, `Section "modifiers" is not allowed directly in importGCATrait(...)`)
  const base = importGCABase(raw, id, name, section, nameExt)

  const baseTrait = importGCABaseTrait(raw, base)
  const trait = _importGCATrait(raw, baseTrait)

  // 4. Parse deep objects
  const _modifiers = raw.modifiers?.[0].modifier?.filter(i => i.name[0] !== ``)
  const _modes = raw.attackmodes?.[0].attackmode?.filter(i => i.name[0] !== ``)

  if (logger) logger.tab() // COMMENT
  if (_modifiers) trait.modifiers = _modifiers.map((m, i) => importGCAModifier(i, m, logger))
  if (_modes) trait.modes = _modes.map((m, i) => importGCAMode(i, m, logger))
  if (logger) logger.untab() // COMMENT

  return trait
}

// #region CORE

function importGCABase<TSection extends TraitSection>(raw: AnyObject, id: number, name: string, section: TSection, nameExt?: MaybeUndefined<string>): GCABase<TSection> {
  const ref: AnyObject = raw.ref?.[0] ?? {}
  const extended: AnyObject[] = raw.extended?.[0]?.extendedtag ?? []

  const base: GCABase = {
    _raw: raw,
    section,
    id,
    //
    conditional: extract(raw, `Conditional`),
    description: extract(raw, `Description`),
    displayNameFormula: extract(raw, `DisplayNameFormula`),
    displayScoreFormula: extract(raw, `DisplayScoreFormula`),
    gives: extract(raw, `Gives`),
    group: extract(raw, `Group`),
    mods: extract(raw, `Mods`),
    name,
    nameExt,
    page: extract(raw, `Page`),
    //
    childKeyList: extract(raw, `ChildKeyList`),
    _inactive: parseYesNo(extract(raw, `Inactive`)) ?? false,
  }

  removeUndefinedKeys(base)

  return base as GCABase<TSection>
}

function importGCABaseTrait(raw: AnyObject, base: GCABase<GCABaseTrait[`section`]>): GCABaseTrait {
  const baseTrait: GCABaseTrait = {
    ...base,
    // parent-traits
    childProfile: parseInt(extract(raw, `ChildProfile`)),
    // system-traits
    displayCost: parseInt(extract(raw, `DisplayCost`)),
    displayName: parseString(extract(raw, `DisplayName`)),
    // traits-with-damage-modes
    modes: [],
    //
    blockAt: extract(raw, `BlockAt`),
    countCapacity: parseInt(extract(raw, `CountCapacity`)),
    db: parseInt(extract(raw, `DB`)),
    dr: extract(raw, `DR`),
    drNotes: extract(raw, `DRNotes`),
    hide: parseYesNo(extract(raw, `Hide`)),
    hideMe: extract(raw, `HideMe`),
    itemNotes: extract(raw, `ItemNotes`),
    needs: extract(raw, `Needs`),
    parryAt: extract(raw, `ParryAt`),
    skillUsed: extract(raw, `SkillUsed`),
    taboo: extract(raw, `Taboo`),
    tl: extract(raw, `TL`),
    units: extract(raw, `Units`),
    upTo: extract(raw, `UpTo`),
    userNotes: extract(raw, `UserNotes`),
    uses: parseInt(extract(raw, `Uses`)),
    vars: extract(raw, `Vars`),
    weightCapacity: parseInt(extract(raw, `WeightCapacity`)),
    weightCapacityUnits: extract(raw, `WeightCapacityUnits`),
    //
    modifiers: [],
    //
    _sysLevels: parseInt(extract(raw, `SysLevels`)),
  }

  removeUndefinedKeys(baseTrait)

  return baseTrait
}

function _importGCATrait(raw: AnyObject, baseTrait: GCABaseTrait): GCATrait {
  const nonAttribute = importGCABaseNonAttribute(raw)

  const nonSkillNonSpellNonEquipment: DiffObjects<GCABaseNonSkillNonSpellNonEquipment, GCATrait> = {
    levelNames: extract(raw, `LevelNames`),
  }

  if (baseTrait.section === `equipment`) {
    const equipment: GCAEquipment = {
      ...(baseTrait as GCABaseTrait<GCAEquipment[`section`]>),
      ...nonAttribute,
      // system-equipment-traits
      displayWeight: parseInt(extract(raw, `DisplayWeight`)),
      //
      baseCost: parseInt(extract(raw, `BaseCost`)),
      baseCostFormula: extract(raw, `BaseCostFormula`),
      baseQty: extract(raw, `BaseQty`),
      baseWeight: parseInt(extract(raw, `BaseWeight`)),
      baseWeightFormula: extract(raw, `BaseWeightFormula`),
      costFormula: extract(raw, `CostFormula`),
      count: parseInt(extract(raw, `Count`)),
      location: extract(raw, `Location`),
      techLevel: extract(raw, `TL`),
      weightFormula: extract(raw, `WeightFormula`),
      where: extract(raw, `Where`),
    }

    removeUndefinedKeys(equipment)

    // TODO: Do this later

    return equipment
  }

  const _isGeneralTrait = isGeneralTrait(baseTrait.section)
  const pointBased = _isGeneralTrait ? ({} as GCABaseTraitPointBased) : importGCABaseTraitPointBased(raw)

  if (baseTrait.section === `attributes`) {
    const attribute: GCAAttribute = {
      ...(baseTrait as GCABaseTrait<GCAAttribute[`section`]>),
      ...nonSkillNonSpellNonEquipment,
      ...pointBased,
      //
      baseValue: extract(raw, `BaseValue`),
      display: extract(raw, `Display`),
      down: extract(raw, `Down`),
      downFormula: extract(raw, `DownFormula`),
      maxScore: extract(raw, `MaxScore`),
      minScore: extract(raw, `MinScore`),
      step: parseInt(extract(raw, `Step`)),
      symbol: extract(raw, `Symbol`),
      up: extract(raw, `Up`),
      //
      _baseScore: parseInt(extract(raw, `BaseScore`)),
      _score: parseInt(extract(raw, `Score`)),
    }

    removeUndefinedKeys(attribute)

    // SYS_LEVELS === BONUSES ?????

    // BASE_SCORE = score BEFORE BONUSES
    //            = INITIAL_SCORE + BOUGHT_SCORE

    const ignore = [`Metric`].includes(attribute.name)

    // INITIAL_SCORE = $solve(BASE_VALUE)
    const isNumericBaseValue = isNumber(attribute.baseValue) || typing.guessType(attribute.baseValue) === `number`
    if (!ignore && isNumericBaseValue) {
      const initialScore = parseInt(attribute.baseValue, true)

      // BOUGHT_SCORE = (BASE_POINTS / (UP, DOWN)) * STEP
      const down = !isNil(attribute.down) ? parseInt(attribute.down, true) : 1
      const up = !isNil(attribute.up) ? parseInt(attribute.up, true) : 1
      const direction = attribute.basePoints < 0 ? down : up

      const step = !isNil(attribute.step) ? parseInt(attribute.step, true) : 1

      const boughtScore = direction === 0 ? 0 : (attribute.basePoints / direction) * step
      if (attribute.basePoints >= 1 && direction == 0) debugger

      // SCORE = INITIAL_SCORE + BOUGHT_SCORE + BONUSES
      //       = BASE_SCORE + BONUSES
      const baseScore = initialScore + boughtScore
      const score = baseScore + attribute._sysLevels!

      if (baseScore !== attribute._baseScore) debugger
      if (score !== attribute._score) debugger
    }

    // if (!(attribute._sysLevels! >= 1) && attribute.basePoints > 0) debugger

    return attribute
  }

  if (baseTrait.section === `skills` || baseTrait.section === `spells`) {
    const skillOrSpell: GCASkillOrSpell = {
      ...(baseTrait as GCABaseTrait<GCASkillOrSpell[`section`]>),
      ...nonAttribute,
      ...pointBased,
      //
      default: parseString(extract(raw, `Default`)),
      round: parseInt(extract(raw, `Round`)),
      type: parseString(extract(raw, `Type`), true),
    }

    const isTechnique = skillOrSpell.type?.toUpperCase().startsWith(`TECH`)

    const sd = parseInt(extract(raw, `SD` as any)) // The 'special default' flag, for marking techniques or combinations.
    const defFrom = extract(raw, `DefFrom` as any) // The trait from which this trait is defaulted.
    const defFromId = parseInt(extract(raw, `DefFromID` as any)) // The ID Key for the trait from which this trait is defaulted.
    //      sometimes defFrom is not set, probably when the skill defaults from its base attribute
    const defLevel = parseInt(extract(raw, `DefLevel` as any)) // The level received from defaulting from another trait.
    const pointMult = parseInt(extract(raw, `PointMult` as any)) // The total point multipliers received from bonuses; generally not used in GURPS 4th Edition.
    const levelMult = parseInt(extract(raw, `LevelMult` as any)) // The total level multipliers received from bonuses; generally not used in GURPS 4th Edition.
    // syslevels                                                 // The total number of bonus levels received from other traits.
    const extraLevels = parseInt(extract(raw, `ExtraLevels` as any)) // The 'free' levels being received from all bonus sources.
    // baselevel                                                    // The base level (based on base points for skills and spells), to which bonuses are added. This is Calculated for skills and spells.
    // basePoints
    const multPoints = parseInt(extract(raw, `MultPoints` as any)) // The points value multiplied by pointmult. // BASE_POINTS * POINT_MULT
    const appPoints = parseInt(extract(raw, `AddPoints` as any)) // The final total of applicable points for determining the level of the trait.
    const preModsPoints = parseInt(extract(raw, `PreModsPoints` as any)) // The total points before any modifiers are applied.
    const baseAppPoints = parseInt(extract(raw, `BaseAddPoints` as any)) // The initial total of applicable points for determining the level of the trait.
    // syslevels                                                 // The total number of bonus levels received from other traits.

    // points: The final total points for the trait, from all sources and owned children.

    if (sd !== 0 && !isTechnique && !skillOrSpell.childKeyList) debugger // NOTE: What sort of non-parent SD is not a technique?

    assert(pointMult === 1, `Point multipliers are not used in GURPS 4th Edition`)
    assert(levelMult === 1, `Level multipliers are not used in GURPS 4th Edition`)

    const difficulty = skillOrSpell.type!.split(`/`)[1]! as `E` | `A` | `H` | `VH`

    /**
     * SKILL COST TABLE
     *
     *
     * Points   Easy    Average    Hard   Very Hard
     *   0      -4      -5         -6     -6/NONE (but it varies extensively for skills)
     *   1      +0      -1         -2     -3
     *   2      +1      +0         -1     -2
     *   4      +2      +1         +0     -1
     *   8      +3      +2         +1     +0
     *
     *   +4     +1      +1         +1     +1
     *
     *  Attributes  1/2/4/8
     * -3
     *
     * Points   Difficulty
     *   0      -4 + DifficultyModifier**
     *   1      +0 + DifficultyModifier
     *   2      +1 + DifficultyModifier
     *   4      +2 + DifficultyModifier
     *   8      +3 + DifficultyModifier
     *
     * Points   Any
     *   0      -4
     *   1      +0
     *   2      +1
     *   4      +2
     *   8      +3
     */

    // DIFFICULTY_MODIFIER = [0, -1, -2, -3] for [Easy, Average, Hard, Very Hard]
    const difficultyModifier = { E: 0, A: -1, H: -2, VH: -3 }[difficulty]

    // SKILL_BOUGHT_LEVEL = -4 - DIFFICULTY_MODIFIER + 1*VH         {if POINTS = 0}
    //                    = POINTS - 1 - DIFFICULTY_MODIFIER        {if 0 < POINTS < 4}
    //                    = (POINTS / 4) + 1 - DIFFICULTY_MODIFIER  {if POINTS >= 4}
    const SKILL_BOUGHT_LEVEL = (points: number) => {
      if (points === 0) -4 - difficultyModifier + +(difficulty === `VH`)
      return getProgressionIndex(`1/2/4/8`, points) - difficultyModifier
    }
    /**
     * TECNNIQUE COST TABLE
     *
     *  Level     +0    +1    +2    +3    +4    +X
     *  Average   0     1     2     3     4     +1
     *  Hard      0     2     3     4     5     +1
     *
     *
     *  TECH/A    1/2
     *  TECH/H    2/3
     */

    // BOUGHT_LEVEL = POINTS + DIFFICULTY_MODIFIER  {if POINTS > 0}
    //              = 0                             {if POINTS = 0}
    const techniqueProgression = difficulty === `A` ? `1/2` : `2/3`
    const TECHNIQUE_BOUGHT_LEVEL = (points: number) => {
      if (points === 0) return 0
      return getProgressionIndex(techniqueProgression, points) + 1
    }

    const BOUGHT_LEVEL = isTechnique ? TECHNIQUE_BOUGHT_LEVEL : SKILL_BOUGHT_LEVEL

    // BASE_LEVEL = DEFAULT_LEVEL + BOUGHT_LEVEL(BASE_POINTS x COST)
    const baseLevel = defLevel! + BOUGHT_LEVEL(skillOrSpell.basePoints!)
    // FINAL_LEVEL = BASE_LEVEL + EXTRA_LEVELS
    const finalLevel = baseLevel + (extraLevels ?? 0)
    assert(extraLevels === skillOrSpell._sysLevels, `What is the difference between "SYS_LEVELS" and "EXTRA_LEVELS"???`)

    // DEBUG
    // =================================================================================

    const level = parseInt(extract(raw, `Level` as any))

    removeUndefinedKeys(skillOrSpell)

    // no need checking base level calculation without the default value in calc (happens sometimes for skills)
    if (defLevel !== 0) {
      if (!isNil(skillOrSpell.baseLevel) && skillOrSpell.baseLevel !== baseLevel) debugger
      if (isNaN(finalLevel) && level !== 0) debugger
      if (!isNaN(finalLevel) && finalLevel !== level) debugger
    }

    // if (!skillOrSpell.type?.startsWith(`Tech`)) debugger

    // if (!skillOrSpell.type?.startsWith(`Tech`)) { }

    // =================================================================================

    return skillOrSpell
  }

  // section !== `attributes` | `skills` | `spells` | `equipment` | `modifiers`
  // assert(baseTrait.section !== `attributes` && baseTrait.section !== `skills` && baseTrait.section !== `spells` && baseTrait.section !== `equipment` && baseTrait.section !== `modifiers`, `Section "${baseTrait.section}" is not valid`)

  const generalTrait: GCAGeneralTrait = {
    ...(baseTrait as GCABaseTrait<GCAGeneralTrait[`section`]>),
    ...nonAttribute,
    ...nonSkillNonSpellNonEquipment,
    ...pointBased,
  }

  removeUndefinedKeys(generalTrait)

  // LEVEL-BASED <=> level -> points

  const ignore = [`Common`, `English`, `Language Talent`].includes(generalTrait.name)
  const _modifiers = raw.modifiers?.[0].modifier?.filter(i => i.name[0] !== ``) ?? []

  if (!ignore && _modifiers.length === 0 && isNilOrEmpty(generalTrait.childKeyList) && !generalTrait._inactive) {
    const _points = parseInt(extract(raw, `Points`))
    const _premodspoints = parseInt(extract(raw, `PreModsPoints` as any)) ?? 0
    const _level = parseInt(extract(raw, `Level`))

    // LEVEL = BASE_LEVEL + BONUSES
    const level = generalTrait.baseLevel! + generalTrait._sysLevels!

    // POINTS = BASE_LEVEL * COST
    const points = getProgressionStep(generalTrait.cost!, generalTrait.baseLevel! - 1)

    if (_level !== level) debugger
    if (_premodspoints !== points) debugger

    const points2 = getProgressionStep(generalTrait.cost!, generalTrait.baseLevel! - 1)
  }

  return generalTrait
}

function importGCABaseNonAttribute(raw: AnyObject): DiffObjects<GCABaseNonAttribute, GCATrait> {
  const nonAttribute: DiffObjects<GCABaseNonAttribute, GCATrait> = {
    cost: extract(raw, `Cost`),
    formula: extract(raw, `Formula`),
    //
    baseLevel: parseInt(extract(raw, `BaseLevel`)),
  }

  removeUndefinedKeys(nonAttribute)

  return nonAttribute
}

function importGCABaseTraitPointBased(raw: AnyObject): DiffObjects<GCABaseTraitPointBased, GCATrait> {
  const basePoints = parseInt(extract(raw, `BasePoints`)) // The base points spent on the trait.
  const childPoints = parseInt(extract(raw, `ChildPoints`)) // The total points spent on all children of this trait.

  const baseTraitNonEquipment: DiffObjects<GCABaseTraitPointBased, GCATrait> = {
    basePoints: basePoints ?? 0,
    childPoints,
  }

  return baseTraitNonEquipment
}

function importGCAModifier(index: number, raw: AnyObject, logger?: Builder): GCAModifier {
  // 1. Always start with ID, NAME and SECTION (always must have values)
  const id = parseInt(raw.$.idkey, true)
  const name = parseString(raw.name[0], true)

  // 2. Get NAME EXTENSION for debug
  const _nameExt: MaybeUndefined<string> = raw.nameext?.[0]
  const nameExt = isNameExtensionValid(_nameExt) ? _nameExt : undefined

  if (logger) {
    logger.add(...paint.grey(paint.dim(`[modifiers/`), index, paint.dim(`/`), id, paint.dim(`] `)), paint.blue(`${name}`)) // COMMENT
    if (nameExt) logger.add(paint.blue.dim(` (${nameExt})`)) // COMMENT
    logger.debug() // COMMENT
  }

  // 3. Parse object
  const base = importGCABase(raw, id, name, `modifiers`)
  const modifier: GCAModifier = {
    ...base,
    ...importGCABaseNonAttribute(raw),
    //
    levelNames: extract(raw, `LevelNames`),
    //
    forceFormula: parseYesNo(extract(raw, `ForceFormula`)),
    round: parseInt(extract(raw, `Round`)),
    shortName: extract(raw, `ShortName`),
    tier: parseInt(extract(raw, `Tier`)),
  }

  removeUndefinedKeys(modifier)

  return modifier
}

function importGCAMode(index: number, raw: AnyObject, logger?: Builder): GCAMode {
  // 1. Always start with ID and DAMAGE (to determine mode type)
  const name = parseString(raw.name[0], true)
  const damage = parseString(raw.damage?.[0])

  if (logger) logger.add(...paint.grey(paint.dim(`[modes/`), `${index}`, paint.dim(`] `)), paint.green(`${name}`)).debug() // COMMENT

  // 2. Parse General Mode
  const mode: GCAMode = { name, skillUsed: extract(raw, `SkillUsed`) }
  if (!isDamageMode(damage)) return mode

  // 3. Parse Damage Mode
  const damageMode: GCADamageMode = {
    ...mode,
    //
    acc: extract(raw, `Acc`),
    armorDivisor: parseInt(extract(raw, `ArmorDivisor`)),
    break: parseInt(extract(raw, `Break`)),
    bulk: parseInt(extract(raw, `Bulk`)),
    damage,
    damageBasedOn: extract(raw, `DamageBasedOn`),
    damType: extract(raw, `DamType`),
    lc: extract(raw, `LC`),
    maxDam: extract(raw, `MaxDam`),
    minST: extract(raw, `MinST`),
    minSTBasedOn: extract(raw, `MinSTBasedOn`),
    parry: extract(raw, `Parry`),
    rangeHalfDam: extract(raw, `RangeHalfDam`),
    rangeMax: extract(raw, `RangeMax`),
    rcl: parseNullableInt(extract(raw, `Rcl`)),
    reach: extract(raw, `Reach`),
    reachBasedOn: extract(raw, `ReachBasedOn`),
    rof: parseNullableInt(extract(raw, `ROF`)),
    shots: extract(raw, `Shots`),
  }

  removeUndefinedKeys(damageMode)

  return damageMode
}

// #endregion

// #region UTILS

function parseNullableInt(value: Nilable<string>, strict?: false | boolean): MaybeUndefined<Nullable<number>>
function parseNullableInt(value: Nilable<string>, strict: true): Nullable<number>
function parseNullableInt(value: Nilable<string>, strict: boolean = false): MaybeUndefined<Nullable<number>> {
  if (value === undefined || value === null) {
    if (strict) throw new Error(`Value is required`)
    return undefined
  }

  if (value.trim() === `-`) return null

  const number = Number.parseInt(value)
  assert(!Number.isNaN(number), `Value "${value}" is not a number`)
  return number
}

function parseInt(value: Nilable<string | number>, strict?: false | boolean): MaybeUndefined<number>
function parseInt(value: Nilable<string | number>, strict: true): number
function parseInt(value: Nilable<string | number>, strict: boolean = false): MaybeUndefined<number> {
  if (value === undefined || value === null) {
    if (strict) throw new Error(`Value is required`)
    return undefined
  }

  const number = !isString(value) ? value : Number.parseInt(value)
  assert(!Number.isNaN(number), `Value "${value}" is not a number`)
  return number
}

function parseString<TString extends string = string>(value: Nilable<string>, strict?: false | boolean): MaybeUndefined<TString>
function parseString<TString extends string = string>(value: Nilable<string>, strict: true): TString
function parseString<TString extends string = string>(value: Nilable<string>, strict: boolean = false): MaybeUndefined<TString> {
  if (value === undefined || value === null) {
    if (strict) throw new Error(`Value is required`)
    return undefined
  }

  assert(isString(value), `Value "${value}" is not a string`)
  return value.trim() as TString
}

function parseYesNo(value: Nilable<string>, strict?: false | boolean): MaybeUndefined<boolean>
function parseYesNo(value: Nilable<string>, strict: true): boolean
function parseYesNo(value: Nilable<string>, strict: boolean = false): MaybeUndefined<boolean> {
  const stringValue = parseString(value, strict)

  if (stringValue) {
    assert(stringValue.toLowerCase() === `no` || stringValue.toLowerCase() === `yes`, `Value "${stringValue}" is not a valid Yes/No value`)

    return stringValue.toLowerCase() === `no` ? false : true
  }

  return undefined
}

function parseFromExtended(extended: AnyObject[], targetTagName: TagName | CalcsTagNames): MaybeUndefined<string> {
  for (const extendedTag of extended) {
    const tagName = parseString(extendedTag.tagname?.[0], true)
    const tagValue = parseString(extendedTag.tagvalue?.[0], true)

    if (tagName.toLowerCase() === targetTagName.toLowerCase()) return tagValue
  }

  return undefined
}

function extract(raw: AnyObject, tagName: TagName | CalcsTagNames): MaybeUndefined<string> {
  const ref: AnyObject = raw.ref?.[0] ?? {}
  const extended: AnyObject[] = raw.extended?.[0]?.extendedtag ?? []
  const calcs: AnyObject = raw.calcs?.[0] ?? {}

  const _tagName = tagName.toLowerCase()

  //

  const fromRaw = parseString(raw[_tagName]?.[0])
  const fromRef = parseString(ref[_tagName]?.[0])
  const fromExtended = parseFromExtended(extended, tagName)
  const fromCalcs = parseString(calcs[_tagName]?.[0])

  const validValues = [fromRaw, fromRef, fromExtended, fromCalcs].filter(i => i !== undefined)
  assert(validValues.length <= 1, `Multiple values for "${tagName}" found`)

  return validValues[0]
}

function removeUndefinedKeys(object: AnyObject) {
  for (const key in object) {
    if (object[key] === undefined) delete object[key]
  }
}

// #endregion

export type CalcsTagNames =
  | `SysLevels` //
  | `ChildKeyList`
  | `Inactive`
  | `Points`
  // BASE TRAITS
  | `BasePoints`
  | `ChildPoints`
  // GENERAL TRAITS
  | `BaseLevel`
  // SKILLS AND SPELLS
  // ATTRIBUTES
  | `Score`
  | `BaseScore`
