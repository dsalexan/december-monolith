import assert from "assert"
import { BasePattern, BasePatternOptions } from "./base"

export class EqualsValuePattern<TValue = any> extends BasePattern {
  declare type: `equals`
  public value: TValue

  constructor(value: TValue, options: Partial<BasePatternOptions> = {}) {
    super(`equals`, options)
    this.value = value
  }

  override _match<TTestValue = TValue>(value: TTestValue): boolean {
    // @ts-ignore
    return this.value === value
  }
}

export class RegexValuePattern extends BasePattern {
  declare type: `regex`
  public regex: RegExp

  constructor(regex: RegExp, options: Partial<BasePatternOptions> = {}) {
    super(`regex`, options)
    this.regex = regex
  }

  override _match<TValue = any>(value: TValue): boolean {
    return this.regex.test(String(value))
  }
}

export const ValuePatternTypes = [`equals`, `regex`] as const
export type ValuePatternType = (typeof ValuePatternTypes)[number]

export type ValuePattern<TValue = any> = EqualsValuePattern<TValue> | RegexValuePattern

export function isValuePattern<TValue = any>(pattern: BasePattern): pattern is ValuePattern<TValue> {
  return ValuePatternTypes.includes(pattern.type as any)
}

// #region FACTORIES

export function EQUALS<TValue = any>(value: TValue): EqualsValuePattern<TValue> {
  return new EqualsValuePattern(value)
}

export function REGEX(pattern: RegExp): RegexValuePattern {
  return new RegexValuePattern(pattern)
}
// #endregion
