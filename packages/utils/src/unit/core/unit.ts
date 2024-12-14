import assert from "assert"
import { Match } from "../.."
import { IS_ELEMENT_OF } from "../../match/element"
import Quantity from "../quantity"

import { BaseUnit, BaseUnitOptions, IUnit, UnitAcceptProtocol } from "./base"
import { MaybeUndefined } from "tsdef"

/**
 * Most basic implementation of a UNIT
 */

export interface UnitSettings {
  acceptsMissingValue: boolean
}

export interface UnitOptions extends BaseUnitOptions, Partial<UnitSettings> {}

export class Unit extends BaseUnit implements IUnit {
  protected readonly _symbol: string
  protected readonly _name: string
  public readonly dimension: string // or quantity
  //
  public readonly settings: UnitSettings

  public get name(): string {
    return this._name
  }

  public get symbol(): string {
    return this._symbol
  }

  public get synonyms() {
    return [this.symbol, this.name, ...this.otherSynonyms]
  }

  constructor(symbol: string, name: string, dimension: string, options: UnitOptions = {}) {
    super(options)

    this._symbol = symbol
    this._name = name
    this.dimension = dimension
    //
    this.settings = { acceptsMissingValue: options.acceptsMissingValue ?? false }

    this.default()
  }

  /** Test if value is an UNIT */
  public static isUnit(value: unknown): value is Unit {
    return value instanceof Unit
  }

  /** wtf?? */
  public accepts(type: UnitAcceptProtocol) {
    if (type === `missing-value`) return this.settings.acceptsMissingValue

    throw new Error(`Unknown accept protocol "${type}"`)
  }
}
