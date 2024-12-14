import { MaybeUndefined, Nullable } from "tsdef"

import { Prefix, PrefixCollection } from "../prefix"
import Quantity from "../quantity"
import { Match } from "../.."
import { String } from "lodash"
import { IS_ELEMENT_OF } from "../../match/element"
import assert from "assert"

export type UnitSearchCriteria = `name` | `symbol` | `any`
export type UnitAcceptProtocol = `missing-value`

export interface IUnit {
  symbol: string
  name: string
  synonyms: string[]
  //
  toString(): string
  toQuantity<TValue extends string | number = string | number>(numericaValue: TValue): Quantity<TValue>
  //
  isEquals(other: IUnit): boolean
  isMatch(value: unknown): MaybeUndefined<Match.BasePatternMatch>
  //
  accepts(type: UnitAcceptProtocol): boolean
}

export interface BaseUnitOptions {
  patterns?: Match.Pattern[]
  synonyms?: string[]
}

export class BaseUnit {
  protected readonly otherSynonyms: string[]
  protected _patterns: Match.Pattern[]

  public get name(): string {
    throw new Error(`Not implemented`)
  }

  public get symbol(): string {
    throw new Error(`Not implemented`)
  }

  public get synonyms(): string[] {
    throw new Error(`Not implemented`)
  }

  public get patterns() {
    return this._patterns
  }

  constructor(options: BaseUnitOptions = {}) {
    this.otherSynonyms = options.synonyms ?? []
  }

  protected default() {
    if (!this._patterns || this._patterns.length === 0) this._patterns = [IS_ELEMENT_OF(this.synonyms)]
  }

  // PARSERS

  public toQuantity<TValue extends string | number = string | number>(value: TValue) {
    return new Quantity(value, this as any as IUnit)
  }

  public toString() {
    return `${this.symbol} (${this.name})`
  }

  // TESTS

  public isEquals(other: IUnit): boolean {
    return this.name === other.name
  }

  /** Test if value is a match for unit (by name, symbol or some synoynm) */
  public isMatch(value: unknown): MaybeUndefined<Match.BasePatternMatch> {
    const matches = this.patterns.map(pattern => pattern.match(value))
    const trueMatches = matches.filter(match => match.isMatch)

    assert(trueMatches.length <= 1, `Too many matches`)

    return trueMatches[0]
  }
}
