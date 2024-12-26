import assert from "assert"
import { BasePattern, BasePatternOptions, PatternMatchInfo } from "./base"
import { isEqual } from "lodash"
import { Nullable } from "tsdef"

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

  override _match<TTestElement = TElement>(value: TTestElement): PatternMatchInfo {
    return { isMatch: isEqual(this.element, value) }
  }

  override _toString() {
    return `="${this.element}"`
  }
}

export interface RegexPatternMatchInfo extends PatternMatchInfo {
  regexResult: Nullable<RegExpExecArray>
}

export class RegexElementPattern extends BasePattern<RegexPatternMatchInfo> {
  declare type: `regex`
  public regex: RegExp

  constructor(regex: RegExp, options: Partial<BasePatternOptions> = {}) {
    super(`regex`, options)
    this.regex = regex
  }

  override _match<TValue = any>(value: TValue): RegexPatternMatchInfo {
    const regexMatch = this.regex.exec(String(value))
    return {
      isMatch: regexMatch !== null,
      regexResult: regexMatch,
    }
  }

  override _toString() {
    return `${this.regex.toString()}`
  }
}

export interface IsElementOfSetPatternMatchInfo extends PatternMatchInfo {
  index: number
}

export class IsElementOfSetPattern<TElementValue = unknown> extends BasePattern<IsElementOfSetPatternMatchInfo> {
  declare type: `is_element_of`
  public superset: TElementValue[]

  constructor(superset: TElementValue[], options: Partial<BasePatternOptions> = {}) {
    super(`is_element_of`, options)
    this.superset = [...superset]
  }

  override _match<TTestElementValue = TElementValue>(value: TTestElementValue): IsElementOfSetPatternMatchInfo {
    const index = this.superset.findIndex(element => isEqual(element, value))
    return { isMatch: index > -1, index }
  }

  override _toString() {
    return `∈ {${this.superset.join(`, `)}}`
  }
}

export interface FunctionMatchInfo extends PatternMatchInfo {
  // result: unknown
}

export type TestFunction = (...args: any[]) => boolean

export class FunctionPattern<TFunction extends TestFunction> extends BasePattern<FunctionMatchInfo> {
  declare type: `function`
  public fn: TFunction

  constructor(fn: TFunction, options: Partial<BasePatternOptions> = {}) {
    super(`function`, options)
    this.fn = fn
  }

  override _match<TValue = any>(value: TValue): FunctionMatchInfo {
    const result = this.fn(value)
    return {
      isMatch: result,
    }
  }

  override _toString() {
    return `${this.fn.name}(...)`
  }
}

export const ElementPatternTypes = [`equals`, `regex`, `is_element_of`, `function`] as const
export type ElementPatternType = (typeof ElementPatternTypes)[number]

export type ElementPattern<TValue = any> = EqualsElementPattern<TValue> | RegexElementPattern | IsElementOfSetPattern<TValue> | FunctionPattern<TestFunction>

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

export function FUNCTION<TFunction extends TestFunction>(fn: TFunction): FunctionPattern<TFunction> {
  return new FunctionPattern(fn)
}

// #endregion
