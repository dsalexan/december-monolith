// export { DEFAULT_READY_CHECKERS } from "./readyCheckers"
// export type { DefaultReadyCheckerProvider } from "./readyCheckers"
import { Nilable, Nullable } from "tsdef"
import { assert } from "console"
import { isNumber } from "lodash"

import type Interpreter from "../.."

import { ArtificialToken, getTokenKind } from "../../../token"

import { BinaryExpression, BooleanLiteral, Expression, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../../tree"
import { BooleanValue, ExpressionValue, NumericValue, ObjectValue, QuantityValue, RuntimeEvaluation, RuntimeValue, StringValue, UnitValue } from "../../runtime"
import { NodeConversionFunction, PostProcessFunction } from ".."
import { SyntacticalContext } from "../../../parser"

export const postProcess: PostProcessFunction = (i: Interpreter, evaluation: RuntimeEvaluation<RuntimeValue<any>, Expression>, syntacticalContext: SyntacticalContext): Nilable<RuntimeValue<any>> => {
  let runtimeValue: Nilable<RuntimeValue<any>> = undefined

  assert([`expression`, `if`].includes(syntacticalContext.mode), `Unimplemented syntactical context`)

  // A. If RuntimeValue exists
  if (evaluation.runtimeValue) {
    if (syntacticalContext.mode === `expression`) {
      if (ObjectValue.isObjectValue(evaluation.runtimeValue)) {
        if (evaluation.runtimeValue.hasNumericRepresentation()) runtimeValue = new NumericValue(evaluation.runtimeValue.asNumber())
        else runtimeValue = null // object lacks a numeric representation, so evaluation was UNSUCCESSFUL
      } else if (ExpressionValue.isExpressionValue(evaluation.runtimeValue)) {
        debugger
      }
    }
  }

  return runtimeValue
}

export const DEFAULT_POST_PROCESS = { postProcess }
export type DefaultPostProcessProvider = typeof DEFAULT_POST_PROCESS
