import { IUnit } from "./base"

export interface QuantityStringOptions {
  noSpace?: boolean
  useUnitName?: boolean
}

export default class Quantity<TValue extends string | number = string | number> {
  value: TValue
  unit: IUnit

  constructor(value: TValue, unit: IUnit) {
    this.value = value
    this.unit = unit
  }

  toString(options: Partial<QuantityStringOptions> = {}) {
    const _space = options.noSpace ? `` : ` `
    const _unit = options.useUnitName ? this.unit.getName() : this.unit.getSymbol()

    return `${this.value}${_space}${_unit}`
  }
}

export function isQuantity(value: unknown): value is Quantity {
  return value instanceof Quantity
}
