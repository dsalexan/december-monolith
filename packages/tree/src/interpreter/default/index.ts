import assert from "assert"
import { isNumber } from "lodash"

import { ArtificialToken } from "../../token/core"
import { getTokenKind } from "../../token/kind"

import type Interpreter from ".."

import { BinaryExpression, BooleanLiteral, CallExpression, ExpressionStatement, Identifier, IfExpression, Node, NodeType, NumericLiteral, Statement, StringLiteral, UnitLiteral } from "../../tree"

import { Environment, EvaluationFunction, ParseToNodeFunction, RuntimeValue } from ".."
import { evaluateBinaryExpression, evaluateCallExpression, evaluateIfExpression, evaluateIdentifier, evaluateNumericLiteral, evaluateStringLiteral, evaluateUnitLiteral } from "./expressions"
import { evaluateExpressionStatement } from "./statements"
import { NumericValue, UnitValue, isBooleanValue, isNumericValue, isQuantityValue, isStringValue, isUnitValue } from "../valueTypes"

export const evaluate: EvaluationFunction = (i: Interpreter, node: Node, environment: Environment): RuntimeValue<any> | Node => {
  if (node.type === `NumericLiteral`) return evaluateNumericLiteral(i, node as NumericLiteral, environment)
  else if (node.type === `StringLiteral`) return evaluateStringLiteral(i, node as StringLiteral, environment)
  else if (node.type === `UnitLiteral`) return evaluateUnitLiteral(i, node as StringLiteral, environment)
  else if (node.type === `Identifier`) return evaluateIdentifier(i, node as Identifier, environment)
  else if (node.type === `BinaryExpression`) return evaluateBinaryExpression(i, node as BinaryExpression, environment)
  else if (node.type === `CallExpression`) return evaluateCallExpression(i, node as CallExpression, environment)
  else if (node.type === `IfExpression`) return evaluateIfExpression(i, node as IfExpression, environment)
  //
  else if (node.type === `ExpressionStatement`) return evaluateExpressionStatement(i, node as ExpressionStatement, environment)
  //
  else throw new Error(`Node type not implemented for interpretation/evaluation: ${node.type}`)
}

export const runtimeValueToNode: ParseToNodeFunction<RuntimeValue<any>> = (i: Interpreter, value: RuntimeValue<any>): Node => {
  if (isBooleanValue(value)) return new BooleanLiteral(value.value)
  if (isNumericValue(value)) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), String(value.value)))
  if (isStringValue(value)) return new StringLiteral(new ArtificialToken(getTokenKind(`string`), value.value))
  if (isUnitValue(value)) return new UnitLiteral(value.value, new ArtificialToken(getTokenKind(`string`), value.content))
  if (isQuantityValue(value)) {
    assert(isNumber(value.value.value), `Quantity value must be a number.`)
    const numericLeft = i.runtimeValueToNode<NumericValue>(i, { type: `number`, value: value.value.value }) as NumericLiteral
    const unitRight = i.runtimeValueToNode<UnitValue>(i, { type: `unit`, value: value.value.unit, content: null as any }) as UnitLiteral

    return new BinaryExpression(numericLeft, new ArtificialToken(getTokenKind(`asterisk`), `*`), unitRight)
  }

  throw new Error(`Cannot parse runtime value to expression string: ${value.type}`)
}
