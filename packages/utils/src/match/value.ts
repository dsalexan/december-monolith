import assert from "assert"

export interface BaseValuePattern {}

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
  if (pattern.type === `equals`) return pattern.value === value
  else if (pattern.type === `regex`) return pattern.pattern.test(String(value))
  else if (pattern.type === `list`) return pattern.values.includes(value)

  assert(false, `Invalid pattern type`)
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
