import { UnitManager, SimpleUnit, UnitPrefixesCollection, SI_PREFIXES_COLLECTION } from "@december/utils/unit"

export { UnitManager, Quantity } from "@december/utils/unit"
export type { IUnit } from "@december/utils/unit"

export const _GRAM = new SimpleUnit(`g`, `gram`, `mass`)
export const GRAMS = new UnitPrefixesCollection(_GRAM, SI_PREFIXES_COLLECTION)

export const BASE_UNITS = [GRAMS]

export const D6 = new SimpleUnit(`d6`, `six-sided die`, `dimensionless`, { acceptsMissingValue: true })
export const D4 = new SimpleUnit(`d4`, `four-sided die`, `dimensionless`, { acceptsMissingValue: true })

export const DICE = [D6, D4]

export const UNIT_MANAGER = new UnitManager()
UNIT_MANAGER.add(...BASE_UNITS, ...DICE)
