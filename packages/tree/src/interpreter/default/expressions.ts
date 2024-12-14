import { Nullable } from "tsdef"
import assert from "assert"

import { Quantity } from "@december/utils/unit"

import { Token } from "../../token/core"
import { BinaryExpression, CallExpression, Identifier, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../tree"

import type Interpreter from ".."
import { BooleanValue, NumericValue, parseRuntimeValueToExpression, QuantityValue, RuntimeValue, StringValue, UnitValue } from "../valueTypes"
import Environment, { VARIABLE_NOT_FOUND } from "../environment"
import { EvaluationFunction } from ".."

export const evaluateBinaryExpression: EvaluationFunction = (i: Interpreter, binaryExpression: BinaryExpression, environment: Environment): RuntimeValue<any> | Node => {
  const left = i.evaluate(i, binaryExpression.left, environment)
  const right = i.evaluate(i, binaryExpression.right, environment)

  const areBothSidesEvaluated = !Node.isNode(left) && !Node.isNode(right)
  if (!areBothSidesEvaluated) {
    const leftNode = Node.isNode(left) ? left : parseRuntimeValueToExpression(left)
    const rightNode = Node.isNode(right) ? right : parseRuntimeValueToExpression(right)

    // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
    return new BinaryExpression(leftNode, binaryExpression.operator, rightNode)
  }

  const operator = binaryExpression.operator.content

  const isAlgebraic = [`+`, `-`, `*`, `/`].includes(operator)
  const isLogical = [`=`, `!=`, `>`, `<`, `>=`, `<=`].includes(operator)

  if (isLogical) return evaluateLogicalBinaryExpression(left, right, operator)
  else if (isAlgebraic) {
    if (left.type === `number` && right.type === `number`) return evaluateNumericAlgebraicOperation(left as NumericValue, right as NumericValue, operator)
    else if (left.type === `number` && right.type === `unit` && operator === `*`) return evaluateQuantity(left as NumericValue, right as UnitValue)
  }

  throw new Error(`BinaryExpression not implemented for types: ${left.type} and ${right.type}`)
}

export const evaluateIdentifier: EvaluationFunction = (i: Interpreter, identifier: Identifier, environment: Environment): RuntimeValue<any> | Node => {
  const variableName = identifier.getValue()
  const value = environment.get(variableName)

  if (value === VARIABLE_NOT_FOUND) return identifier
  return value
}

export const evaluateCallExpression: EvaluationFunction = (i: Interpreter, callExpression: CallExpression, environment: Environment): RuntimeValue<any> | Node => {
  throw new Error(`CallExpression not implemented.`)
}

// "PRIMITIVES"
//    Evaluations that ALWAYS return a runtime value

export const evaluateNumericLiteral: EvaluationFunction = (i: Interpreter, numericLiteral: NumericLiteral, environment: Environment): NumericValue => ({ type: `number`, value: numericLiteral.getValue() })
export const evaluateStringLiteral: EvaluationFunction = (i: Interpreter, stringLiteral: StringLiteral, environment: Environment): StringValue => ({ type: `string`, value: stringLiteral.getValue() })
export const evaluateUnitLiteral: EvaluationFunction = (i: Interpreter, unitLiteral: UnitLiteral, environment: Environment): UnitValue => ({ type: `unit`, value: unitLiteral.unit })

// UTILS

function evaluateNumericAlgebraicOperation(left: NumericValue, right: NumericValue, operator: string): NumericValue {
  let result: Nullable<number> = null

  if (operator === `+`) result = left.value + right.value
  else if (operator === `-`) result = left.value - right.value
  else if (operator === `*`) result = left.value * right.value
  else if (operator === `/`) result = left.value / right.value
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)
  assert(!Number.isNaN(result), `Result cannot be NaN.`)

  return { type: `number`, value: result }
}

function evaluateLogicalBinaryExpression(left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string): BooleanValue {
  let result: Nullable<boolean> = null

  if (operator === `=`) result = left.value === right.value
  else if (operator === `!=`) result = left.value !== right.value
  else if (operator === `>`) result = left.value > right.value
  else if (operator === `<`) result = left.value < right.value
  else if (operator === `>=`) result = left.value >= right.value
  else if (operator === `<=`) result = left.value <= right.value
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)

  return { type: `boolean`, value: result }
}

function evaluateQuantity(left: NumericValue, right: UnitValue): QuantityValue {
  const quantity = new Quantity(left.value, right.value)

  return { type: `quantity`, value: quantity }
}
