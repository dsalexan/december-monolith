import assert from "assert"
import { isNil, max, maxBy, range, uniq } from "lodash"

import { MutableObject, ObjectController } from "@december/compiler"
import { Reference } from "@december/utils/access"

import { Quantity } from "@december/utils/unit"
import { typing } from "@december/utils"

import { Node } from "@december/tree/tree"
import Interpreter, { Environment, FunctionValue, Contextualized, RuntimeFunction, RuntimeEvaluation, RuntimeValue, NumericValue, ObjectValue, StringValue, BooleanValue } from "@december/tree/interpreter"

import { DamageTable } from "./character"
import { AnyFunction } from "tsdef"

export function makeGURPSEnvironment() {
  const environment = new Environment(`gurps:global`)

  environment.assignValue(`@basethdice`, new FunctionValue(basethdice, `@basethdice`))
  environment.assignValue(`@itemhasmod`, new FunctionValue(itemhasmod, `@itemhasmod`))

  environment.assignValue(`@max`, new FunctionValue(_max, `@max`))

  return environment
}

export const basethdice: Contextualized = (i: Interpreter, node: Node, environment: Environment) => (runtimeLevel: RuntimeValue<any>) => {
  assert(runtimeLevel.hasNumericRepresentation(), `Level should be a number (or at least have a numeric representation)`)

  const character: MutableObject = environment.get(`character`)?.value
  if (!character) return null

  const damageTable: DamageTable = character.getProperty(`damageTable`)
  if (!damageTable) return null

  const level = runtimeLevel.asNumber()
  assert(level > 0, `Level should be a positive number`)
  const damage = damageTable[level]
  if (!damage) return null

  const dice = damage.thr.clone({ refreshID: true })
  return dice
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

  if (trait.isEmptyObject()) return new BooleanValue(false)

  debugger
  return null as any
}

export const _max: Contextualized =
  (i: Interpreter, node: Node, environment: Environment) =>
  (...args: RuntimeValue<any>[]) => {
    assert(args.length > 0, `At least one argument is required`)

    const numericValues: number[] = []
    for (const runtimeValue of args) {
      assert(runtimeValue.hasNumericRepresentation(), `All arguments must be numbers`)
      const value = runtimeValue.asNumber()
      numericValues.push(value)
    }

    const maxValue = max(numericValues)!

    return new NumericValue(maxValue)
  }

if (!global.__GURPS_ENVIRONMENT) global.__GURPS_ENVIRONMENT = makeGURPSEnvironment()
export const GURPSEnvironment: Environment = global.__GURPS_ENVIRONMENT
