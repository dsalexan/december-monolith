import { UnitManager, SimpleUnit, UnitPrefixesCollection, SI_PREFIXES_COLLECTION } from "."

export const _GRAM = new SimpleUnit(`g`, `gram`, `mass`)
export const GRAMS = new UnitPrefixesCollection(_GRAM, SI_PREFIXES_COLLECTION)

export const BASE_UNITS = [GRAMS]

export const D6 = new SimpleUnit(`d6`, `six-sided die`, `dimensionless`)
export const D4 = new SimpleUnit(`d4`, `four-sided die`, `dimensionless`)

export const DICE = [D6, D4]

// TESTING

const unitManager = new UnitManager()
unitManager.add(...BASE_UNITS)
unitManager.add(...DICE)

console.log(unitManager.getUnits(`name`, `gram`).map(unit => unit.toString()))
console.log(unitManager.getUnits(`name`, `kilogram`).map(unit => unit.toString()))
console.log(unitManager.getUnits(`symbol`, `dag`).map(unit => unit.toString()))
console.log(unitManager.getUnits(`symbol`, `d4`).map(unit => unit.toString()))

const d6 = unitManager.getUnit(`symbol`, `d6`)!
console.log(d6.toQuantity(10).toString({ noSpace: true }))

const KILOGRAM = unitManager.getUnit(`any`, `kg`)!
console.log(KILOGRAM.toQuantity(2).toString())
