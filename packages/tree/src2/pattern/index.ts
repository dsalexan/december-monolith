import assert from "assert"

export interface BasePattern {}

export interface NonePattern extends BasePattern {
  type: `none`
}

export interface StringPattern extends BasePattern {
  type: `string`
  value: string
}

export interface RegexPattern extends BasePattern {
  type: `regex`
  pattern: RegExp
}

export interface ListPattern extends BasePattern {
  type: `list`
  values: string[]
}

export const PatternTypes = [`none`, `string`, `regex`, `list`] as const
export type PatternType = (typeof PatternTypes)[number]

export type Pattern = NonePattern | StringPattern | RegexPattern | ListPattern

// #region FACTORIES

export function NONE(): NonePattern {
  return { type: `none` }
}

export function STRING(value: string): StringPattern {
  return { type: `string`, value }
}

export function REGEX(pattern: RegExp): RegexPattern {
  return { type: `regex`, pattern }
}

export function LIST(...values: string[]): ListPattern {
  return { type: `list`, values }
}

// #endregion

export function match(value: string, pattern: Pattern): boolean {
  if (pattern.type === `string`) return pattern.value === value
  else if (pattern.type === `regex`) return pattern.pattern.test(value)
  else if (pattern.type === `list`) return pattern.values.includes(value)
  else if (pattern.type === `none`) return false
  else assert(false, `Invalid pattern type`)

  return false
}
