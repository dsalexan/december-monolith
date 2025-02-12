import { Get, MergeDeep, OmitDeep } from "type-fest"

import { Trait } from "@december/gurps"

export const SPECIAL_CASE_TEXT_CONCATENATION_BONUSES = [
  `NoBase`, // clears the base value data before evaluating the rest of the bonuses, allowing for the entire CHARX value to be determined by granted bonuses.
  `NoCalc`, // prevents the tag from being calculated, if it is normally calculated, and results in the CHARX tag being just the concatenated base and text bonus values. ??????
  `NoSize`, // only available for bonuses targeted to REACH$, this prevents the application of adjustments based on the character’s Size Modifier.
] as const
export type SpecialCaseTextConcatenationBonuses = typeof SPECIAL_CASE_TEXT_CONCATENATION_BONUSES

// export interface IGURPSBonusException {
//   tag?: string
//   operator: `different` | `equals` | `greater` | `less` | `greaterOrEqual` | `lessOrEqual`
//   value: string
//   // negative?: boolean // for OnlyIf
// }

export interface IGURPSBonus {
  /**
   * Bonuses granted by Conditional() dont affect final target value, but a message is shown somewhere
   * Gives() changes the target value
   */
  _notation: string
  //
  singleBonus?: boolean // single bonus vs per-level basis
  bonus: {
    expression: string // MATH_ENABLED()
    value: SpecialCaseTextConcatenationBonuses | number
  }
  maximum?: {
    expression: string
    value: number // upto, MATH_ENABLED()
  }
  //
  source: {
    trait: string // trait name OR "me" for gaining bonuses (requires "from" keyword in notation)
    tag: string
  }
  //
  dontApplyByDefault?: boolean // if Conditional() then TRUE
  //
  //
  targets: {
    trait: string // trait name OR "me" for gaining bonuses (requires "from" keyword in notation)
    tag: string
    textConcatenation?: boolean // indicates if bonus should be concatenated as a string to current value (instead of adding numeric values)
  }[]
  //
  byMode?: {
    // This optional block allows you to specify that the bonus applies on a per-mode basis and may not be universally applicable to the target
    tag: string // MODE_ENABLED tag name
    comparison: Trait.TraitSelector
    subCriteria?: Trait.TraitSelectorSubcriteria
    value: string // value that you're comparing TAG against
  }
  //
  //
  unless?: boolean // IGURPSBonusException; MATH_ENABLED
  onlyIf?: boolean // IGURPSBonusException; MATH_ENABLED
  //
  //
  description?: string // ListAs()
  reason?: string // SPECIAL_CASE_SUBSTITUTION()
}

export type NonRuntimeIGURPSBonus = OmitDeep<IGURPSBonus, `bonus` | `maximum` | `unless` | `onlyIf` | `reason`>
export interface RuntimeIGURPSBonus<TRuntimeBooleanValue, TRuntimeNumericValue, TRuntimeStringValue> extends NonRuntimeIGURPSBonus {
  bonus: { expression: string; value?: TRuntimeNumericValue } // MATH_ENABLED()
  maximum?: { expression: string; value?: TRuntimeNumericValue } // upto, MATH_ENABLED()
  unless?: { expression: string; value?: TRuntimeBooleanValue }
  onlyIf?: { expression: string; value?: TRuntimeBooleanValue }
  reason?: { expression: string; value?: TRuntimeStringValue } // SPECIAL_CASE_SUBSTITUTION()
}

export type bonus = Get<RuntimeIGURPSBonus<`boolean`, `number`, `string`>, `bonus`>
//            ^?
export type bonus1 = Get<RuntimeIGURPSBonus<`boolean`, `number`, `string`>, `unless.value`>
//            ^?

// export interface PartialRuntimeIGURPSBonusValue<TRuntimeBooleanValue, TRuntimeNumericValue, TRuntimeStringValue> {
//   bonus: { expression: string; value?: TRuntimeNumericValue | TRuntimeStringValue } // MATH_ENABLED()
//   maximum?: { expression: string; value?: TRuntimeNumericValue } // upto, MATH_ENABLED()
//   unless?: { expression: string; value?: TRuntimeBooleanValue }
//   onlyIf?: { expression: string; value?: TRuntimeBooleanValue }
//   reason?: { expression: string; value?: TRuntimeStringValue } // SPECIAL_CASE_SUBSTITUTION()
// }

// export type RuntimeIGURPSBonus<TRuntimeBooleanValue, TRuntimeNumericValue, TRuntimeStringValue> = MergeDeep<IGURPSBonus, PartialRuntimeIGURPSBonusValue<TRuntimeBooleanValue, TRuntimeNumericValue, TRuntimeStringValue>>

export type CalculationMethod =
  | `RangeMethod` // Do NOBASE, Do NOCALC (Append Bonus String, Exit), Preserve Known Suffixes, DamageBasedOn/ST adjustment, Append Bonus String, Solver, Apply Bonuses, Apply Suffix
  | `ReachMethod` // Text Function Solver, Do NOBASE, Do NOCALC (Append Bonus String, exit), Do NOSIZEMOD, Append Bonus String, Damage Mode Special Case Subs, Text Function Solver, Do ReachBasedOn, Adjust for Size Modifier
  | `ScoreMethod` // Do NOBASE, Append Bonus String, Damage Mode Special Case Subs, Text Function Solver, Solver, Apply Bonuses
  | `ValueMethod` // Do NOBASE, Append Bonus String, Damage Mode Special Case Subs, Text Function Solver, Solver, Apply Bonuses, Preserve Empty
  | `ValueMethodSuffix` // Do NOBASE, Preserve Suffix, Append Bonus String, Solver, Apply Bonuses, Apply Suffix, Preserve Empty
  | `Special`
  | `SimpleMath`

export interface BonusTagCalculationDefinition {
  storedTo: string
  modeSpecific?: boolean
  method: CalculationMethod
}

export const DEFINITION = (storedTo: string, method: CalculationMethod): BonusTagCalculationDefinition => ({ storedTo, method })
export const MODE_DEFINITION = (storedTo: string, method: CalculationMethod): BonusTagCalculationDefinition => ({ storedTo, method, modeSpecific: true })

/**
 * Note that LEVEL and POINTS are redundant with the normal bonus handling
 *
 * When GCA calculates values for many (NOT ALL???) of these tags, it stores the results in new tags (prefixed with CHAR)
 *
 * There is also a way to target the TEXT VALUE of a tag, by inclusing "$" at the end of target tag (trait::tagName$)
 *    For example, to apply a text bonus to the DAMTYPE() tag of a trait, you might use an expression like
 *    gives(=" dbk" to owner::damtype$), which would append the text to the end of the existing DAMTYPE() tag data
 */
export const GCA_VALID_BONUS_TAGS = [
  `Acc`, //
  `ArmorDivisor`,
  `BlockAt`,
  `Break`,
  `Bulk`,
  `Damage`,
  `DamType`,
  `DB`,
  `Deflect`,
  `DR`,
  `EffectiveST`,
  `FencingPenalty`,
  `Fortify`,
  `Level`,
  `Location`,
  `MinST`,
  `Parry`,
  `ParryAt`,
  `ParryScore`,
  `Points`,
  `Radius`,
  `RaiseRuleOf`,
  `RangeHalfDam`,
  `RangeMax`,
  `Rcl`,
  `Reach`,
  `ROF`,
  `Shots`,
  `SkillScore`,
] as const
export type GCAValidBonusTags = (typeof GCA_VALID_BONUS_TAGS)[number]

export const BONUS_TAGS: Record<GCAValidBonusTags, BonusTagCalculationDefinition> = {
  Acc: MODE_DEFINITION(`CharAcc`, `ValueMethodSuffix`),
  ArmorDivisor: MODE_DEFINITION(`CharArmorDivisor`, `ValueMethod`),
  BlockAt: DEFINITION(`BlockLevel`, `ScoreMethod`),
  Break: MODE_DEFINITION(`CharBreak`, `ValueMethod`),
  Bulk: MODE_DEFINITION(`CharBulk`, `ValueMethod`),
  Damage: MODE_DEFINITION(`CharDamage`, `Special`),
  DamType: MODE_DEFINITION(`CharDamType`, `Special`), // Do NOBASE, Append Bonus String, Damage Mode Special Case Subs, Text Function Solver
  DB: DEFINITION(`CharDB`, `SimpleMath`),
  Deflect: DEFINITION(`CharDeflect`, `ValueMethod`),
  DR: DEFINITION(`CharDR`, `SimpleMath`),
  EffectiveST: MODE_DEFINITION(`CharEffectiveST`, `Special`), // ST=DamageBasedOn, Do NOBASE, Do NOCALC, Append Bonus String, Solver, Apply Bonuses
  FencingPenalty: DEFINITION(`CharFencingPenalty`, `ValueMethod`),
  Fortify: DEFINITION(`CharFortify`, `ValueMethod`),
  Level: DEFINITION(`Level`, `Special`), // ?????
  Location: DEFINITION(`CharLocation`, `Special`), // Text and text functions only.
  MinST: MODE_DEFINITION(`CharMinST`, `ValueMethodSuffix`),
  Parry: MODE_DEFINITION(`CharParry`, `Special`), // Do NOBASE, Append Bonus String, Damage Mode Special Case Subs, TextFunctionSolver, “no”, U/F suffix perserved, Solver, Apply Bonuses
  ParryAt: DEFINITION(`[\`ParryLevel\`, \`ParryAtBonus\`, \`ParryAtMult\`]`, `ScoreMethod`),
  ParryScore: MODE_DEFINITION(`CharParryScore`, `Special`), // There is no base PARRYSCORE() tag; bonuses targeted to it are used in the calculation of CHARPARRYSCORE() based on CHARSKILLUSED(), CHARPARRY(), PARRYAT(), PARRYATBONUS(), and PARRYATMULT().
  Points: DEFINITION(`Points`, `Special`), // ?????
  Radius: MODE_DEFINITION(`CharRadius`, `RangeMethod`),
  RaiseRuleOf: DEFINITION(`RaiseRuleOf`, `Special`), // There is no base RAISERULEOF() tag; bonuses targeted to it are stored in RAISERULEOF(); only +/- bonuses are supported
  RangeHalfDam: MODE_DEFINITION(`CharRangeHalfDam`, `RangeMethod`),
  RangeMax: MODE_DEFINITION(`CharRangeMax`, `RangeMethod`),
  Rcl: null as any,
  Reach: MODE_DEFINITION(`CharReach`, `ReachMethod`),
  ROF: null as any,
  Shots: MODE_DEFINITION(`CharShots`, `ValueMethodSuffix`),
  SkillScore: MODE_DEFINITION(`CharSkillScore`, `Special`), // There is no base SKILLSCORE() tag; bonuses targeted to it are used in the calculation of CHARSKILLSCORE() when evaluating SKILLUSED()
}

export const GCA_BONUS_KEYWORDS = [
  `=`, //
  `To`,
  `From`,
  `UpTo`,
  `Unless`,
  `OnlyIf`,
  `When`,
  `ListAs`,
]

export function GCABonusTargetToString(gcaBonus: IGURPSBonus) {
  const targets = gcaBonus.targets.map(({ trait, tag, textConcatenation }) => `${trait}::${tag}${textConcatenation ? `$` : ``}`)
  const target = targets.length > 1 ? `(${targets.join(`, `)})` : targets[0]

  // byMode = ` ByMode ${tag} ${comparison}${subCriteria} ${value}`
  const byMode: string = !gcaBonus.byMode ? `` : ` ByMode ${gcaBonus.byMode.tag} ${gcaBonus.byMode.comparison}${gcaBonus.byMode.subCriteria ?? ``} ${gcaBonus.byMode.value}`

  return ` ${target}${byMode}`
}

export function GCABonusExceptionsToString(gcaBonusExceptions: IGURPSBonus) {
  // const localExceptionText = ` ${unless} Target${tagName}${operator}${value}`
  let exceptionText: string = ``
  const exceptions: (string | undefined)[] = [] // [gcaBonusExceptions?.unless, gcaBonusExceptions?.onlyIf] // TODO: I dont really keep the expression in IGURPSBonus, just the final boolean value
  for (const [i, exception] of exceptions.entries()) {
    if (exception === undefined) continue

    const unless = i === 0 ? `Unless` : `OnlyIf`

    // ` ${unless} ${_exception}`
    // exceptionText += !exception ? `` : ` ${unless} Target${!exception.tag ? `` : `::${exception.tag}`}${exception.operator}${exception.value}`
    exceptionText += ` ${unless} ${exception}`
  }

  return exceptionText
}

export function GCABonusInformationToString(gcaBonusInformation: IGURPSBonus) {
  const reason: string = !gcaBonusInformation.reason ? `` : ` When "${gcaBonusInformation.reason}"`
  const description: string = !gcaBonusInformation.description ? `` : ` ListAs "${gcaBonusInformation.description}"`

  return `${description}${reason}`
}

export function GCABonusToString(gcaBonus: IGURPSBonus) {
  // VALUE
  const singleBonus = gcaBonus.singleBonus ? `= ` : ``

  const bonus = gcaBonus.bonus.toString()

  let source: string = ``
  if (gcaBonus.source) {
    if (gcaBonus.source.trait === `me`) source = ``
    else {
      const tag = gcaBonus.source.tag === `default` ? `` : `::${gcaBonus.source.tag}`
      source = ` From ${gcaBonus.source.trait}${tag}`
    }
  }

  // upTo = ` UpTo ${limit}`
  const upTo: string = !gcaBonus.maximum ? `` : ` UpTo ${gcaBonus.maximum}`

  // 2. Parse target and exceptions
  const target = GCABonusTargetToString(gcaBonus)
  const exception = `` //GCABonusExceptionsToString(gcaBonus)
  const information = GCABonusInformationToString(gcaBonus)

  return `${singleBonus}${bonus} to ${target}${source}${upTo}${exception}${information}`
}
