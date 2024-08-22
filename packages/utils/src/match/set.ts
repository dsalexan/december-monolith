import assert from "assert"
import { BasePattern, BasePatternOptions } from "./base"

export class ContainedInSetPattern<TValue = any> extends BasePattern {
  declare type: `contained_in`
  public superset: TValue[]

  constructor(superset: TValue[], options: Partial<BasePatternOptions> = {}) {
    super(`contained_in`, options)
    this.superset = [...superset]
  }

  override _match<TTestValue = TValue>(value: TTestValue): boolean {
    return this.superset.includes(value as any)
  }
}

export class ContainsSetPattern<TValue = any> extends BasePattern {
  declare type: `contains`
  public value: TValue

  constructor(value: TValue, options: Partial<BasePatternOptions> = {}) {
    super(`contains`, options)
    this.value = value
  }

  override _match<TTestValue = TValue>(superset: TTestValue[]): boolean {
    return superset.includes(this.value as any)
  }
}

export const SetPatternTypes = [`contained_in`, `contains`] as const
export type SetPatternType = (typeof SetPatternTypes)[number]

export type SetPattern<TValue = any> = ContainedInSetPattern<TValue> | ContainsSetPattern<TValue>

export function isSetPattern<TValue = any>(pattern: BasePattern): pattern is SetPattern<TValue> {
  return SetPatternTypes.includes(pattern.type as any)
}

// #region FACTORIES

export function CONTAINED_IN<TValue = any>(superset: TValue[]): ContainedInSetPattern<TValue> {
  return new ContainedInSetPattern(superset)
}

export function CONTAINS<TValue = any>(value: TValue, negate?: boolean): ContainsSetPattern<TValue> {
  return new ContainsSetPattern(value, { negate })
}

// #endregion
