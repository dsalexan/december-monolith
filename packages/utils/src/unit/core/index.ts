import { IUnit } from "./base"
import { Unit } from "./unit"
import { PrefixedUnit, PrefixedUnitFactory } from "./prefixedUnit"

export type { IUnit } from "./base"
export { Unit } from "./unit"
export { PrefixedUnit, PrefixedUnitFactory } from "./prefixedUnit"

export type UnitDefinition = IUnit | PrefixedUnitFactory

export function isUnit(value: unknown): value is IUnit {
  return Unit.isUnit(value) || PrefixedUnit.isPrefixedUnit(value)
}

export function isUnitDefinition(value: unknown): value is UnitDefinition {
  return isUnit(value) || value instanceof PrefixedUnitFactory
}
