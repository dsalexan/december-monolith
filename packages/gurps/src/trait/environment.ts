import { isNil } from "lodash"
import { AnyObject } from "tsdef"
import assert from "assert"

import { FUNCTION, REGEX } from "@december/utils/match/element"
import { Reference } from "@december/utils/access"

import { MutableObject, ObjectController } from "@december/compiler"
import Interpreter, { Environment, ObjectValue, FunctionValue, Contextualized, RuntimeFunction, RuntimeEvaluation, RuntimeValue, VariableValue, NumericValue, PropertyValue } from "@december/tree/interpreter"

import { isAlias } from "."
// import { NON_RESOLVED_VALUE } from "../../../tree/src/environment/identifier"

import { GURPSEnvironment } from "../environment"

export function makeGURPSTraitEnvironment(character: MutableObject, self: AnyObject) {
  const environment = new Environment(`gurps:trait`, GURPSEnvironment)

  // environment.assignValue(`@basethdice`, new FunctionValue(basethdice, `@basethdice`))
  environment.assignValue(`character`, new ObjectValue(character))
  environment.assignValue(`me`, new ObjectValue(self))

  environment.assignValue(`%level`, new PropertyValue(`me`, `level`))

  // environment.assignValueToPattern(`alias`, REGEX(/^"?\w{2}:.+"?$/), new VariableValue(`alias_level::fallback`))
  environment.assignValueToPattern(`alias`, FUNCTION(isAlias), new VariableValue(`alias_level::fallback`))
  environment.assignValue(`alias_level::fallback`, new ObjectValue({}, { numberValue: 0 }))

  return environment
}
