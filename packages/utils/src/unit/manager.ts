import { MaybeUndefined, Nullable } from "tsdef"
import { IUnit, UnitDefinition, PrefixedUnitFactory } from "./core"
import { UnitSearchCriteria } from "./core/base"

type UnitDefinitionComparator = (definition: UnitDefinition, value: string) => MaybeUndefined<IUnit>

function unitDefinitionComparator_Name(definition: UnitDefinition, name: string): MaybeUndefined<IUnit> {
  if (definition instanceof PrefixedUnitFactory) {
    const unit = definition.by(`name`, name)
    if (unit) return unit
  } else if (definition.name === name) return definition
}

function unitDefinitionComparator_Symbol(definition: UnitDefinition, symbol: string): MaybeUndefined<IUnit> {
  if (definition instanceof PrefixedUnitFactory) {
    const unit = definition.by(`symbol`, symbol)
    if (unit) return unit
  } else if (definition.symbol === symbol) return definition
}

function unitDefinitionComparator_Any(definition: UnitDefinition, symbol: string): MaybeUndefined<IUnit> {
  if (definition instanceof PrefixedUnitFactory) {
    const unit = definition.by(`any`, symbol)
    if (unit) return unit
  } else if (definition.symbol === symbol || definition.name === symbol) return definition
}

export default class UnitManager {
  definitions: UnitDefinition[] = []

  add(...definitions: UnitDefinition[]) {
    for (const definition of definitions) this.definitions.push(definition)
  }

  getUnits(by: UnitSearchCriteria, value: string): IUnit[] {
    let comparator: UnitDefinitionComparator = null as any

    if (by === `name`) comparator = unitDefinitionComparator_Name
    else if (by === `symbol`) comparator = unitDefinitionComparator_Symbol
    else if (by === `any`) comparator = unitDefinitionComparator_Any
    else throw new Error(`Invalid search criteria "${by}"`)

    const units: IUnit[] = []

    for (const definition of this.definitions) {
      const unit = comparator(definition, value)
      if (unit) units.push(unit)
    }

    return units
  }

  getUnit(by: UnitSearchCriteria, value: string): Nullable<IUnit> {
    return this.getUnits(by, value)[0] ?? null
  }
}
