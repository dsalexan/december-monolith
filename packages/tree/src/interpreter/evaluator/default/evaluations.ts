import { MaybeUndefined, Nullable } from "tsdef"
import assert from "assert"

import { Quantity } from "@december/utils/unit"

import { Token } from "../../../token/core"
import { BinaryExpression, CallExpression, ExpressionStatement, Identifier, IfExpression, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../../tree"

import type Interpreter from "../.."
import { BooleanValue, createBooleanValue, createNumericValue, createQuantityValue, createStringValue, createUnitValue, NumericValue, QuantityValue, RuntimeValue, StringValue, UnitValue } from "../../valueTypes"
import Environment, { VARIABLE_NOT_FOUND } from "../../environment"
import { EvaluationFunction } from ".."

export const evaluate: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, node: Node, environment: Environment): RuntimeValue<any> | Node => {
  if (node.type === `NumericLiteral`) return i.evaluator.call(`evaluateNumericLiteral`)(i, node as NumericLiteral, environment)
  else if (node.type === `StringLiteral`) return i.evaluator.call(`evaluateStringLiteral`)(i, node as StringLiteral, environment)
  else if (node.type === `UnitLiteral`) return i.evaluator.call(`evaluateUnitLiteral`)(i, node as StringLiteral, environment)
  else if (node.type === `Identifier`) return i.evaluator.call(`evaluateIdentifier`)(i, node as Identifier, environment)
  else if (node.type === `BinaryExpression`) return i.evaluator.call(`evaluateBinaryExpression`)(i, node as BinaryExpression, environment)
  else if (node.type === `CallExpression`) return i.evaluator.call(`evaluateCallExpression`)(i, node as CallExpression, environment)
  else if (node.type === `IfExpression`) return i.evaluator.call(`evaluateIfExpression`)(i, node as IfExpression, environment)
  //
  else if (node.type === `ExpressionStatement`) return i.evaluator.call(`evaluateExpressionStatement`)(i, node as ExpressionStatement, environment)
  //
  else throw new Error(`Node type not implemented for interpretation/evaluation: ${node.type}`)
}

export const evaluateExpressionStatement: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, expressionStatement: ExpressionStatement, environment: Environment): RuntimeValue<any> | Node => {
  return i.evaluator.evaluate(i, expressionStatement.expression, environment)
}

export const evaluateBinaryExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, binaryExpression: BinaryExpression, environment: Environment): RuntimeValue<any> | Node => {
  const left = i.evaluator.evaluate(i, binaryExpression.left, environment)
  const right = i.evaluator.evaluate(i, binaryExpression.right, environment)

  const areBothSidesEvaluated = !Node.isNode(left) && !Node.isNode(right)
  if (!areBothSidesEvaluated) {
    const leftNode = Node.isNode(left) ? left : i.evaluator.convertToNode(i, left)
    const rightNode = Node.isNode(right) ? right : i.evaluator.convertToNode(i, right)

    // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
    return new BinaryExpression(leftNode, binaryExpression.operator, rightNode)
  }

  const operator = binaryExpression.operator.content

  const isAlgebraic = [`+`, `-`, `*`, `/`].includes(operator)
  const isLogical = [`=`, `!=`, `>`, `<`, `>=`, `<=`].includes(operator)

  let value: MaybeUndefined<RuntimeValue<any> | Node> = undefined

  if (isLogical) return evaluateLogicalBinaryExpression(left, right, operator, binaryExpression)
  else if (isAlgebraic) {
    if (left.type === `number`) {
      // 1. Try to resolve right into something, IDK
      let resolvedRight: RuntimeValue<any> = right
      if (right.type === `string`) {
        debugger
      }

      if (resolvedRight.type === `number`) return evaluateNumericAlgebraicOperation(left as NumericValue, resolvedRight as NumericValue, operator, binaryExpression)

      if (!value) value = i.evaluator.call(`evaluateNumericAndOtherAlgebraicOperation`)(left as NumericValue, resolvedRight, operator, binaryExpression)
    }
  }

  if (!value) value = i.evaluator.call(`evaluateCustomOperation`)(left, right, operator, binaryExpression)

  // ?. If there is something in value, check if wrapping is necessary and return it
  if (value) {
    if (!Node.isNode(value)) return value

    const leftNode = Node.isNode(left) ? left : i.evaluator.convertToNode(i, left)
    const rightNode = Node.isNode(right) ? right : i.evaluator.convertToNode(i, right)

    // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
    return new BinaryExpression(leftNode, binaryExpression.operator, rightNode)
  }

  throw new Error(`BinaryExpression not implemented for types: "${left.type}" and "${right.type}"`)
}

export const evaluateIdentifier: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, identifier: Identifier, environment: Environment): RuntimeValue<any> | Node => {
  const variableName = identifier.getValue()
  const value = environment.get(variableName)

  if (value === VARIABLE_NOT_FOUND) return identifier
  return value
}

export const evaluateCallExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, callExpression: CallExpression, environment: Environment): RuntimeValue<any> | Node => {
  throw new Error(`CallExpression not implemented.`)
}

export const evaluateIfExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, ifExpression: IfExpression, environment: Environment): RuntimeValue<any> | Node => {
  const condition = i.evaluator.evaluate(i, ifExpression.condition, environment)
  if (Node.isNode(condition)) {
    // TODO: Probably dont evaluate consequent/alternative here, for now its just for testing and debugging
    const consequentEvaluation = i.evaluator.evaluate(i, ifExpression.consequent, environment)
    const alternativeEvaluation = i.evaluator.evaluate(i, ifExpression.alternative, environment)

    const consequentNode = Node.isNode(consequentEvaluation) ? consequentEvaluation : i.evaluator.convertToNode(i, consequentEvaluation)
    const alternativeNode = Node.isNode(alternativeEvaluation) ? alternativeEvaluation : i.evaluator.convertToNode(i, alternativeEvaluation)

    return new IfExpression(condition, consequentNode, alternativeNode)
  }

  let result: Nullable<boolean> = null

  if (condition.type === `boolean`) result = condition.value
  else if (condition.type === `number`) result !== 0
  else if (condition.type === `string`) debugger

  assert(result !== null, `Result cannot be null.`)

  if (result) return i.evaluator.evaluate(i, ifExpression.consequent, environment)
  else return i.evaluator.evaluate(i, ifExpression.alternative, environment)
}

// "PRIMITIVES"
//    Evaluations that ALWAYS return a runtime value

export const evaluateNumericLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, numericLiteral: NumericLiteral, environment: Environment): NumericValue => createNumericValue(numericLiteral.getValue(), numericLiteral)
export const evaluateStringLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, stringLiteral: StringLiteral, environment: Environment): StringValue => createStringValue(String(stringLiteral.getValue()), stringLiteral)
export const evaluateUnitLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, unitLiteral: UnitLiteral, environment: Environment): UnitValue => createUnitValue(unitLiteral.unit, unitLiteral)

// "INJECTABLES"
//    Evaluation positioned for easy override
export const evaluateNumericAndOtherAlgebraicOperation = (left: NumericValue, right: RuntimeValue<any>, operator: string, node: Node): MaybeUndefined<RuntimeValue<any> | Node> => {
  if (right.type === `unit` && operator === `*`) return evaluateQuantity(left as NumericValue, right as UnitValue, node)

  return undefined
}

export const evaluateCustomOperation = (left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string, node: Node): MaybeUndefined<RuntimeValue<any> | Node> => {
  // Not implemented by default
  // Custom protocols should override this function

  return undefined
}

export const DEFAULT_EVALUATIONS = {
  evaluate,
  //
  evaluateExpressionStatement,
  //
  evaluateBinaryExpression,
  evaluateIdentifier,
  evaluateCallExpression,
  evaluateIfExpression,
  evaluateNumericLiteral,
  evaluateStringLiteral,
  evaluateUnitLiteral,
  //
  evaluateNumericAndOtherAlgebraicOperation,
  evaluateCustomOperation,
}
export type DefaultEvaluationsProvider = typeof DEFAULT_EVALUATIONS

// #region UTILS

function evaluateNumericAlgebraicOperation(left: NumericValue, right: NumericValue, operator: string, node: Node): NumericValue {
  let result: Nullable<number> = null

  if (operator === `+`) result = left.value + right.value
  else if (operator === `-`) result = left.value - right.value
  else if (operator === `*`) result = left.value * right.value
  else if (operator === `/`) result = left.value / right.value
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)
  assert(!Number.isNaN(result), `Result cannot be NaN.`)

  return createNumericValue(result, node)
}

function evaluateLogicalBinaryExpression(left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string, node: Node): BooleanValue {
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

  return createBooleanValue(result, node)
}

function evaluateQuantity(left: NumericValue, right: UnitValue, node: Node): QuantityValue {
  const quantity = new Quantity(left.value, right.value)

  return createQuantityValue(quantity, node)
}

// #endregion
