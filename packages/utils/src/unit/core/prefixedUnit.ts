import { MaybeUndefined, Nullable } from "tsdef"
import { Prefix, PrefixCollection } from "../prefix"
import Quantity from "../quantity"

import { BaseUnit, BaseUnitOptions, IUnit, UnitAcceptProtocol, UnitSearchCriteria } from "./base"
import { Unit } from "./unit"
import { Match } from "../.."
import assert from "assert"

export interface PrefixedUnitOptions extends BaseUnitOptions {}

export class PrefixedUnit extends BaseUnit implements IUnit {
  public unit: Unit
  public prefix: Prefix

  public get symbol(): string {
    return PrefixedUnit.getSymbol(this.unit, this.prefix)
  }

  public get name(): string {
    return PrefixedUnit.getName(this.unit, this.prefix)
  }

  public get synonyms() {
    return [this.symbol, this.name, ...this.otherSynonyms]
  }

  constructor(unit: Unit, prefix: Prefix, options: PrefixedUnitOptions = {}) {
    super(options)

    this.unit = unit
    this.prefix = prefix

    this.default()
  }

  /** Generates name for (unit, prefix) */
  public static getName(unit: Unit, prefix: Prefix) {
    return prefix.apply(unit.name, `name`)
  }

  /** Generates symbol for (unit, prefix) */
  public static getSymbol(unit: Unit, prefix: Prefix) {
    return prefix.apply(unit.symbol, `symbol`)
  }

  /** Test if value is an UNIT */
  public static isPrefixedUnit(value: unknown): value is PrefixedUnit {
    return value instanceof PrefixedUnit
  }

  /** wtf???? */
  public accepts(type: UnitAcceptProtocol) {
    return this.unit.accepts(type)
  }
}

export class PrefixedUnitFactory {
  unit: Unit
  prefixes: PrefixCollection

  constructor(unit: Unit, prefixCollection: PrefixCollection) {
    this.unit = unit
    this.prefixes = prefixCollection
  }

  /** Builds prefixed unit for prefix */
  public getUnit(prefix?: Nullable<Prefix>) {
    prefix ??= this.prefixes.prefixes.get(`BASE`)
    assert(prefix, `Prefix must be defined`)

    const unit = new PrefixedUnit(this.unit, prefix)

    return unit
  }

  /** Returns prefix by some search criteria */
  public getPrefixBy(by: `name`, name: string): MaybeUndefined<Prefix>
  public getPrefixBy(by: `symbol`, symbol: string): MaybeUndefined<Prefix>
  public getPrefixBy(by: `any`, value: string): MaybeUndefined<Prefix>
  public getPrefixBy(by: UnitSearchCriteria, value: string): MaybeUndefined<Prefix>
  public getPrefixBy(by: UnitSearchCriteria, value: string): MaybeUndefined<Prefix> {
    // 1. First build comparator function
    type Comparator = (prefix: Prefix, value: string) => boolean
    let comparator: Comparator

    if (by === `name`) comparator = (prefix, value) => PrefixedUnit.getName(this.unit, prefix) === value
    else if (by === `symbol`) comparator = (prefix, value) => PrefixedUnit.getSymbol(this.unit, prefix) === value
    else if (by === `any`) comparator = (prefix, value) => PrefixedUnit.getName(this.unit, prefix) === value || PrefixedUnit.getSymbol(this.unit, prefix) === value
    //
    else throw new Error(`unexpected`)

    // 2. Now test every prefix for a matching value
    for (const prefix of this.prefixes.prefixes.values()) {
      if (comparator(prefix, value)) return prefix
    }

    return undefined
  }

  /** Returns unit by some search criteria */
  public by(by: `name`, name: string): MaybeUndefined<PrefixedUnit>
  public by(by: `symbol`, symbol: string): MaybeUndefined<PrefixedUnit>
  public by(by: `any`, value: string): MaybeUndefined<PrefixedUnit>
  public by(by: UnitSearchCriteria, value: string): MaybeUndefined<PrefixedUnit>
  public by(by: UnitSearchCriteria, value: string): MaybeUndefined<PrefixedUnit> {
    const prefix = this.getPrefixBy(by, value)
    if (!prefix) return undefined

    return this.getUnit(prefix)
  }
}
