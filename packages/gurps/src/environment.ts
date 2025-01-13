import assert from "assert"
import { isNil, max, maxBy, range, uniq } from "lodash"

import { MutableObject, ObjectController } from "@december/compiler"
import { Reference } from "@december/utils/access"

import { Quantity } from "@december/utils/unit"
import { typing } from "@december/utils"

import { Node } from "@december/tree/tree"
import Interpreter, { Environment, FunctionValue, Contextualized, RuntimeFunction, RuntimeEvaluation, RuntimeValue, NumericValue, ObjectValue, StringValue, BooleanValue } from "@december/tree/interpreter"

import { DamageTable } from "./character"
import { AnyFunction, AnyObject } from "tsdef"
import { Paths } from "type-fest"
import { ToString } from "type-fest/source/internal"
import { fullName, IGURPSModifier, IGURPSTrait, isAlias } from "./trait"

// produce multiple variable names
function V(baseVariableName: string): string[] {
  const variableNames: string[] = []

  variableNames.push(baseVariableName)
  variableNames.push(baseVariableName.toUpperCase())
  variableNames.push(baseVariableName.toLowerCase())

  return uniq(variableNames)
}

export function makeGURPSEnvironment() {
  const environment = new Environment(`gurps:global`)

  environment.assignValueToMultipleVariables(V(`@BaseTHDice`), new FunctionValue(basethdice, `@BaseTHDice`))

  environment.assignValueToMultipleVariables(V(`@HasMod`), new FunctionValue(hasmod, `@HasMod`))

  environment.assignValueToMultipleVariables(V(`@IndexedValue`), new FunctionValue(indexedValue, `@IndexedValue`))
  environment.assignValueToMultipleVariables(V(`@Int`), new FunctionValue(_int, `@Int`))

  environment.assignValueToMultipleVariables(V(`@ItemHasMod`), new FunctionValue(itemhasmod, `@ItemHasMod`))

  environment.assignValueToMultipleVariables(V(`@Max`), new FunctionValue(_max, `@Max`))

  environment.assignValueToMultipleVariables(V(`@Round`), new FunctionValue(round, `@Round`))

  return environment
}

export const basethdice: Contextualized = (i: Interpreter, node: Node, environment: Environment) => (runtimeLevel: RuntimeValue<any>) => {
  assert(runtimeLevel.hasNumericRepresentation(), `Level should be a number (or at least have a numeric representation)`)

  const character: MutableObject = environment.get(`char`)?.value
  if (!character) return null

  const damageTable: DamageTable = character.getProperty(`damageTable` as never)
  if (!damageTable) return null

  const level = runtimeLevel.asNumber()
  if (level === 0 && ObjectValue.isObjectValue(runtimeLevel) && runtimeLevel.isEmptyObject()) return null // basically ignore function for emptyObject
  assert(level > 0, `Level should be a positive number`)

  const damage = damageTable[level]
  if (!damage) return null

  const dice = damage.thr.clone({ refreshID: true })
  return dice
}

export const hasmod: Contextualized = (i: Interpreter, node: Node, environment: Environment) => (modifier: StringValue) => {
  assert(StringValue.isStringValue(modifier), `Modifier should be a string`)

  const trait = environment.get<ObjectValue<IGURPSTrait>>(`me`)?.value
  assert(trait, `Trait should be defined`)
  const modifiers = trait.modifiers ?? []

  for (const modifier of modifiers) {
    debugger

    const format1 = `${`name`} (${`nameExtension`})`
    const format2 = `${`name`}, ${`nameExtension`}`
  }

  return new BooleanValue(false)
}

export const indexedValue: Contextualized =
  (i: Interpreter, node: Node, environment: Environment) =>
  (index: NumericValue, ...values: RuntimeValue<any>[]): RuntimeValue<any> => {
    assert(index.hasNumericRepresentation(), `Index should be a number (or at least have a numeric representation)`)
    const numericIndex = index.asNumber()

    if (numericIndex === 0) return new StringValue(``) // index 0 is always empty

    assert(values[numericIndex - 1], `Index ${numericIndex} is out of bounds`)
    return values[numericIndex - 1] // 1-indexed
  }

export const _int: Contextualized = (i: Interpreter, node: Node, environment: Environment) => (value: RuntimeValue<any>) => {
  if (!value.hasNumericRepresentation()) return null

  const integerValue = Math.trunc(value.asNumber())
  return new NumericValue(integerValue)
}

/*
 * This function is used to determine if the specified trait has a certain modifier applied to it.
 *
 * @ITEMHASMOD( TRAITNAME, MODNAME)
 *
 * TRAITNAME             is the name of a trait.
 * MODNAME               is the name of a modifier.
 *
 *
 * If the specified trait is found on the character, and the specified modifier is applied to that trait, then this function returns the level of the modifier. Otherwise, this function returns 0.
 *
 * TRAITNAME and MODNAME may be enclosed in quotes or braces, and should be if either might contain a comma.
 * This function will look for modifiers that have name extensions using either the old NAME (NAME EXT) format, or the newer NAME, NAME EXT format that modifiers display in the UI now.
 * */
export const itemhasmod: Contextualized = (i: Interpreter, node: Node, environment: Environment) => (trait: RuntimeValue<any>, modName: RuntimeValue<any>) => {
  assert(ObjectValue.isObjectValue(trait), `First argument should be an object (specifically, a TRAIT)`)
  assert(StringValue.isStringValue(modName), `Second argument should be a string (specifically, a MODNAME)`)

  if (trait.isEmptyObject()) return new NumericValue(0)

  const modifiers: IGURPSModifier[] = trait.getProperty(`modifiers`) ?? []
  const hasModifier = modifiers.some(modifier => {
    if (modifier.name === modName.value) return true
    if (fullName(modifier) === modName.value) return true

    return false
  })

  return new NumericValue(hasModifier ? 1 : 0)
}

export const _max: Contextualized =
  (i: Interpreter, node: Node, environment: Environment) =>
  (...args: RuntimeValue<any>[]) => {
    assert(args.length > 0, `At least one argument is required`)

    const numericValues: number[] = []
    for (const runtimeValue of args) {
      if (!runtimeValue.hasNumericRepresentation()) return null // All arguments must be numbers

      const value = runtimeValue.asNumber()
      numericValues.push(value)
    }

    const maxValue = max(numericValues)!

    return new NumericValue(maxValue)
  }

export const round: Contextualized = (i: Interpreter, node: Node, environment: Environment) => (value: NumericValue, places?: NumericValue) => {
  assert(value.hasNumericRepresentation(), `Value should be a number (or at least have a numeric representation)`)

  const doInteger = isNil(places) || !places.hasNumericRepresentation() || places.asNumber() <= 0
  if (doInteger) return new NumericValue(Math.trunc(value.asNumber()))

  const roundedValue = Number(value.asNumber().toFixed(places.asNumber()))
  assert(!isNaN(roundedValue), `Rounded value is not a number`)

  return new NumericValue(roundedValue)
}

if (!global.__GURPS_ENVIRONMENT) global.__GURPS_ENVIRONMENT = makeGURPSEnvironment()
export const GURPSEnvironment: Environment = global.__GURPS_ENVIRONMENT
