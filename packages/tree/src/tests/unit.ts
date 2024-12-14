import { Unit, PrefixedUnit, PrefixedUnitFactory, SI_PREFIXES_COLLECTION } from "@december/utils/unit"
import { REGEX } from "@december/utils/match/element"

export { UnitManager } from "@december/utils/unit"

export const _GRAM = new Unit(`g`, `gram`, `mass`)
export const GRAMS = new PrefixedUnitFactory(_GRAM, SI_PREFIXES_COLLECTION)

export const BASE_UNITS = [GRAMS]

export const D6 = new Unit(`d6`, `six-sided die`, `dimensionless`, { acceptsMissingValue: true })
export const D4 = new Unit(`d4`, `four-sided die`, `dimensionless`, { acceptsMissingValue: true })

export const DICE = [D6, D4]

// kh: KEEP HIGHEST
// kl: KEEP LOWEST
// kc: KEEP PLAYER'S CHOICE
