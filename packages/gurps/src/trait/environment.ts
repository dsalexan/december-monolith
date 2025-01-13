import { isNil, isString } from "lodash"
import { AnyObject } from "tsdef"
import assert from "assert"

import { EQUALS, FUNCTION, REGEX } from "@december/utils/match/element"
import { Reference } from "@december/utils/access"
import { isNilOrEmpty } from "@december/utils"

import { MutableObject, ObjectController } from "@december/compiler"
import Interpreter, { Environment, ObjectValue, FunctionValue, Contextualized, RuntimeFunction, RuntimeEvaluation, RuntimeValue, VariableValue, NumericValue, PropertyValue } from "@december/tree/interpreter"

import { IGURPSTraitOrModifier, isAlias } from "."
// import { NON_RESOLVED_VALUE } from "../../../tree/src/environment/identifier"

import { GURPSEnvironment } from "../environment"
import IGURPSCharacter from "../character"

export function makeGURPSTraitEnvironment(character: IGURPSCharacter, self: AnyObject) {
  const environment = new Environment(`gurps:trait`, GURPSEnvironment)

  assert(!isNilOrEmpty(character.name) && isString(character.name), `Character name should be a string`)
  // assert(!isNilOrEmpty(self.id) && isString(self.id), `Trait ID should be a string`)

  // environment.assignValue(`@basethdice`, new FunctionValue(basethdice, `@basethdice`))
  environment.assignValue(`char`, new ObjectValue(character))
  environment.assignValue(`me`, new ObjectValue(self))

  environment.assignValue(`%level`, new PropertyValue(`me`, `level.value`))

  environment.assignValueToPattern(`alias`, FUNCTION(isAlias), new VariableValue(`alias_level::fallback`))
  environment.assignValue(
    `alias_level::fallback`,
    new ObjectValue(
      {
        level: { value: 0 },
        score: { value: 0 },
        modifiers: [],
      },
      { numberValue: 0, booleanValue: false },
    ),
  )

  return environment
}
