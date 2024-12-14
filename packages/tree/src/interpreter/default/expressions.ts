import { Nullable } from "tsdef"
import assert from "assert"

import { Quantity } from "@december/utils/unit"

import { Token } from "../../token/core"
import { BinaryExpression, CallExpression, Identifier, IfExpression, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../tree"

import type Interpreter from ".."
import { BooleanValue, NumericValue, QuantityValue, RuntimeValue, StringValue, UnitValue } from "../valueTypes"
import Environment, { VARIABLE_NOT_FOUND } from "../environment"
import { EvaluationFunction } from ".."

export const evaluateBinaryExpression: EvaluationFunction = (i: Interpreter, binaryExpression: BinaryExpression, environment: Environment): RuntimeValue<any> | Node => {
  const left = i.evaluate(i, binaryExpression.left, environment)
  const right = i.evaluate(i, binaryExpression.right, environment)

  const areBothSidesEvaluated = !Node.isNode(left) && !Node.isNode(right)
  if (!areBothSidesEvaluated) {
    const leftNode = Node.isNode(left) ? left : i.runtimeValueToNode(i, left)
    const rightNode = Node.isNode(right) ? right : i.runtimeValueToNode(i, right)

    // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
    return new BinaryExpression(leftNode, binaryExpression.operator, rightNode)
  }

  const operator = binaryExpression.operator.content

  const isAlgebraic = [`+`, `-`, `*`, `/`].includes(operator)
  const isLogical = [`=`, `!=`, `>`, `<`, `>=`, `<=`].includes(operator)

  if (isLogical) return evaluateLogicalBinaryExpression(left, right, operator)
  else if (isAlgebraic) {
    if (left.type === `number`) {
      // 1. Try to resolve right into something, IDK
      let resolvedRight: RuntimeValue<any> = right
      if (right.type === `string`) {
        debugger
      }

      if (resolvedRight.type === `number`) return evaluateNumericAlgebraicOperation(left as NumericValue, resolvedRight as NumericValue, operator)
      else if (resolvedRight.type === `unit` && operator === `*`) return evaluateQuantity(left as NumericValue, resolvedRight as UnitValue)
    }
  }

  throw new Error(`BinaryExpression not implemented for types: "${left.type}" and "${right.type}"`)
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

export const evaluateIfExpression: EvaluationFunction = (i: Interpreter, ifExpression: IfExpression, environment: Environment): RuntimeValue<any> | Node => {
  const condition = i.evaluate(i, ifExpression.condition, environment)
  if (Node.isNode(condition)) {
    // TODO: Probably dont evaluate consequent/alternative here, for now its just for testing and debugging
    const consequentEvaluation = i.evaluate(i, ifExpression.consequent, environment)
    const alternativeEvaluation = i.evaluate(i, ifExpression.alternative, environment)

    const consequentNode = Node.isNode(consequentEvaluation) ? consequentEvaluation : i.runtimeValueToNode(i, consequentEvaluation)
    const alternativeNode = Node.isNode(alternativeEvaluation) ? alternativeEvaluation : i.runtimeValueToNode(i, alternativeEvaluation)

    return new IfExpression(condition, consequentNode, alternativeNode)
  }

  let result: Nullable<boolean> = null

  if (condition.type === `boolean`) result = condition.value
  else if (condition.type === `number`) result !== 0
  else if (condition.type === `string`) debugger

  assert(result !== null, `Result cannot be null.`)

  if (result) return i.evaluate(i, ifExpression.consequent, environment)
  else return i.evaluate(i, ifExpression.alternative, environment)
}

// "PRIMITIVES"
//    Evaluations that ALWAYS return a runtime value

export const evaluateNumericLiteral: EvaluationFunction = (i: Interpreter, numericLiteral: NumericLiteral, environment: Environment): NumericValue => ({ type: `number`, value: numericLiteral.getValue() })
export const evaluateStringLiteral: EvaluationFunction = (i: Interpreter, stringLiteral: StringLiteral, environment: Environment): StringValue => ({ type: `string`, value: stringLiteral.getValue() })
export const evaluateUnitLiteral: EvaluationFunction = (i: Interpreter, unitLiteral: UnitLiteral, environment: Environment): UnitValue => ({ type: `unit`, value: unitLiteral.unit, content: unitLiteral.getContent() })

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
