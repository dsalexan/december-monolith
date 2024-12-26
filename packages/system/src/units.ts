import { UnitManager, Unit, PrefixedUnit, PrefixedUnitFactory, SI_PREFIXES_COLLECTION } from "@december/utils/unit"

export type { IUnit } from "@december/utils/unit"
export { UnitManager, Quantity } from "@december/utils/unit"

export const _GRAM = new Unit(`g`, `gram`, `mass`)
export const GRAMS = new PrefixedUnitFactory(_GRAM, SI_PREFIXES_COLLECTION)

export const BASE_UNITS = [GRAMS]

export const D6 = new Unit(`d6`, `six-sided die`, `dimensionless`, { acceptsMissingValue: true })
export const D4 = new Unit(`d4`, `four-sided die`, `dimensionless`, { acceptsMissingValue: true })

export const DICE = [D6, D4]

export function defaultUnitManager() {
  const UNIT_MANAGER = new UnitManager()
  UNIT_MANAGER.add(...BASE_UNITS)
  // UNIT_MANAGER.add(...DICE)

  return UNIT_MANAGER
}

export const UNIT_MANAGER = defaultUnitManager()
