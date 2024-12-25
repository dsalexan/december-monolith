// export { DEFAULT_READY_CHECKERS } from "./readyCheckers"
// export type { DefaultReadyCheckerProvider } from "./readyCheckers"
import { assert } from "console"
import { isNumber } from "lodash"

import type Interpreter from "../.."

import { ArtificialToken, getTokenKind } from "../../../token"

import { BinaryExpression, BooleanLiteral, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../../tree"
import { BooleanValue, NumericValue, QuantityValue, RuntimeEvaluation, RuntimeValue, StringValue, UnitValue } from "../../runtime"
import { NodeConversionFunction, ReadyCheckerFunction } from ".."

export const isEvaluationReady: ReadyCheckerFunction = (i: Interpreter, evaluation: RuntimeEvaluation) => {
  if (RuntimeEvaluation.isResolved(evaluation)) return true

  return false
}

export const isNodeReady: ReadyCheckerFunction = (i: Interpreter, node: Node) => {
  if (node.type === `BooleanLiteral`) return true
  if (node.type === `NumericLiteral`) return true
  if (node.type === `UnitLiteral`) return true

  return false
}

export const DEFAULT_READY_CHECKERS = { isEvaluationReady, isNodeReady }
export type DefaultReadyCheckerProvider = typeof DEFAULT_READY_CHECKERS
