import assert from "assert"
import { BasePattern, BasePatternOptions } from "./base"

/**
 * https://en.wikipedia.org/wiki/Element_(mathematics)
 *
 * Baby steps. I'll start with "===" (and regex, why not)
 * Any set relations will be included in the Set module
 */

export class EqualsElementPattern<TElement = any> extends BasePattern {
  declare type: `equals`
  public element: TElement

  constructor(element: TElement, options: Partial<BasePatternOptions> = {}) {
    super(`equals`, options)
    this.element = element
  }

  override _match<TTestElement = TElement>(value: TTestElement): boolean {
    // @ts-ignore
    return this.element === value
  }
}

export class RegexElementPattern extends BasePattern {
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

export class IsElementOfSetPattern<TElementValue = unknown> extends BasePattern {
  declare type: `is_element_of`
  public superset: TElementValue[]

  constructor(superset: TElementValue[], options: Partial<BasePatternOptions> = {}) {
    super(`is_element_of`, options)
    this.superset = [...superset]
  }

  override _match<TTestElementValue = TElementValue>(value: TTestElementValue): boolean {
    return this.superset.includes(value as any)
  }
}

export const ElementPatternTypes = [`equals`, `regex`, `is_element_of`] as const
export type ElementPatternType = (typeof ElementPatternTypes)[number]

export type ElementPattern<TValue = any> = EqualsElementPattern<TValue> | RegexElementPattern | IsElementOfSetPattern<TValue>

export function isElementPattern<TValue = any>(pattern: BasePattern): pattern is ElementPattern<TValue> {
  return ElementPatternTypes.includes(pattern.type as any)
}

// #region FACTORIES

export function IS_ELEMENT_OF<TValue = any>(superset: TValue[]): IsElementOfSetPattern<TValue> {
  return new IsElementOfSetPattern(superset)
}

export function EQUALS<TValue = any>(value: TValue, caseInsensitive: boolean = false): EqualsElementPattern<TValue> {
  const _value = caseInsensitive && typeof value === `string` ? value.toLowerCase() : value

  return new EqualsElementPattern(_value as TValue, { caseInsensitive })
}

export function REGEX(pattern: RegExp): RegexElementPattern {
  return new RegexElementPattern(pattern)
}

// #endregion
