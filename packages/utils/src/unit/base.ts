import { Nullable } from "tsdef"

import { Prefix, PrefixCollection } from "./prefix"
import Quantity from "./quantity"

export type UnitSearchCriteria = `name` | `symbol` | `any`

export function isUnit(value: any): value is IUnit {
  return value instanceof SimpleUnit || value instanceof Unit
}

export type UnitAcceptProtocol = `missing-value`

export interface IUnit {
  getSymbol(): string
  getName(): string
  accepts(type: UnitAcceptProtocol): boolean
  //
  toString(): string
  toQuantity<TValue extends string | number = string | number>(numericaValue: TValue): Quantity<TValue>
  //
  isEquals(other: IUnit): boolean
}

export interface SimpleUnitOptions {
  acceptsMissingValue: boolean
  synonyms: string[]
}

export class SimpleUnit implements IUnit {
  symbol: string
  name: string
  dimension: string // or quantity
  //
  options: SimpleUnitOptions

  public getSynonyms() {
    return [this.symbol, this.name, ...this.options.synonyms]
  }

  constructor(symbol: string, name: string, dimension: string, options: Partial<SimpleUnitOptions> = {}) {
    this.symbol = symbol
    this.name = name
    this.dimension = dimension
    //
    this.options = {
      synonyms: options.synonyms ?? [],
      acceptsMissingValue: options.acceptsMissingValue ?? false,
    }
  }

  getSymbol() {
    return this.symbol
  }

  getName() {
    return this.name
  }

  accepts(type: UnitAcceptProtocol) {
    if (type === `missing-value`) return this.options.acceptsMissingValue

    throw new Error(`Unknown accept protocol "${type}"`)
  }

  toString() {
    return `${this.symbol} (${this.name})`
  }

  toQuantity<TValue extends string | number = string | number>(value: TValue) {
    return new Quantity(value, this)
  }

  isEquals(other: IUnit): boolean {
    return this.name === other.getName()
  }
}

export class Unit implements IUnit {
  simpleUnit: SimpleUnit
  prefix: Prefix

  constructor(simpleUnit: SimpleUnit, prefix: Prefix) {
    this.simpleUnit = simpleUnit
    this.prefix = prefix
  }

  getSymbol() {
    return Unit.getSymbol(this.simpleUnit, this.prefix)
  }

  static getSymbol(simpleUnit: SimpleUnit, prefix: Prefix) {
    if (prefix.noLabel) return simpleUnit.symbol
    return `${prefix.symbol}${simpleUnit.symbol}`
  }

  getName() {
    return Unit.getName(this.simpleUnit, this.prefix)
  }

  static getName(simpleUnit: SimpleUnit, prefix: Prefix) {
    if (prefix.noLabel) return simpleUnit.name
    return `${prefix.name}${simpleUnit.name}`
  }

  accepts(type: UnitAcceptProtocol) {
    return this.simpleUnit.accepts(type)
  }

  toString() {
    return `${this.getSymbol()} (${this.getName()})`
  }

  toQuantity<TValue extends string | number = string | number>(value: TValue) {
    return new Quantity(value, this)
  }

  isEquals(other: IUnit): boolean {
    return this.getName() === other.getName()
  }
}

export class UnitPrefixesCollection {
  unit: SimpleUnit
  prefixes: PrefixCollection

  constructor(unit: SimpleUnit, prefixCollection: PrefixCollection) {
    this.unit = unit
    this.prefixes = prefixCollection
  }

  getUnit(prefix?: Nullable<Prefix>) {
    const unit = new Unit(this.unit, prefix ?? this.prefixes.prefixes.get(`BASE`)!)

    return unit
  }

  prefixBy(by: UnitSearchCriteria, value: string) {
    let comparator: (simpleUnit: SimpleUnit, prefix: Prefix, value: string) => boolean = null as any

    if (by === `name`) comparator = (simpleUnit, prefix, value) => Unit.getName(simpleUnit, prefix) === value
    else if (by === `symbol`) comparator = (simpleUnit, prefix, value) => Unit.getSymbol(simpleUnit, prefix) === value
    else if (by === `any`) {
      comparator = (simpleUnit, prefix, value) => Unit.getSymbol(simpleUnit, prefix) === value || Unit.getName(simpleUnit, prefix) === value
    } else throw new Error(`Invalid search criteria "${by}"`)

    for (const prefix of this.prefixes.prefixes.values()) if (comparator(this.unit, prefix, value)) return prefix

    return null
  }

  by(by: UnitSearchCriteria, value: string) {
    const prefix = this.prefixBy(by, value)
    if (!prefix) return null

    return this.getUnit(prefix)
  }
}

export type UnitDefinition = IUnit | UnitPrefixesCollection
