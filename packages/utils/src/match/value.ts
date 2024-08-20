import assert from "assert"

export interface BaseValuePattern {
  negate?: boolean
}

export interface EqualsValuePattern<TValue = any> extends BaseValuePattern {
  type: `equals`
  value: TValue
}

export interface RegexValuePattern extends BaseValuePattern {
  type: `regex`
  pattern: RegExp
}

export interface ListValuePattern<TValue = any> extends BaseValuePattern {
  type: `list`
  values: TValue[]
}

export const ValuePatternTypes = [`equals`, `regex`, `list`] as const
export type ValuePatternType = (typeof ValuePatternTypes)[number]

export type ValuePattern<TValue = any> = EqualsValuePattern<TValue> | RegexValuePattern | ListValuePattern<TValue>

export function matchValue<TValue = any>(value: TValue, pattern: ValuePattern<TValue>): boolean {
  let result = false

  if (pattern.type === `equals`) result = pattern.value === value
  else if (pattern.type === `regex`) result = pattern.pattern.test(String(value))
  else if (pattern.type === `list`) result = pattern.values.includes(value)
  //
  else assert(false, `Invalid pattern type`)

  return pattern.negate ? !result : result
}

// #region FACTORIES

export function EQUALS<TValue = any>(value: TValue): EqualsValuePattern<TValue> {
  return { type: `equals`, value }
}

export function REGEX(pattern: RegExp): RegexValuePattern {
  return { type: `regex`, pattern }
}

export function LIST<TValue = any>(...values: TValue[]): ListValuePattern<TValue> {
  return { type: `list`, values }
}

// #endregion
