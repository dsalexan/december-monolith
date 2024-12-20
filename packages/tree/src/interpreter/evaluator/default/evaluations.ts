import { FunctionValue, RuntimeEvaluation } from "./../../runtime/index"
import { MaybeUndefined, Nullable } from "tsdef"
import assert from "assert"

import { Quantity } from "@december/utils/unit"

import { Token } from "../../../token/core"
import { BinaryExpression, CallExpression, ExpressionStatement, Identifier, IfExpression, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../../tree"

import type Interpreter from "../.."
import { BooleanValue, NumericValue, QuantityValue, RuntimeValue, StringValue, UnitValue } from "../../runtime"
import Environment, { VARIABLE_NOT_FOUND } from "../../environment"
import { EvaluationFunction, EvaluationOutput } from ".."

export const evaluate: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, node: Node, environment: Environment): EvaluationOutput => {
  if (node.type === `NumericLiteral`) return i.evaluator.call(`evaluateNumericLiteral`, i, node as NumericLiteral, environment)
  else if (node.type === `StringLiteral`) return i.evaluator.call(`evaluateStringLiteral`, i, node as StringLiteral, environment)
  else if (node.type === `UnitLiteral`) return i.evaluator.call(`evaluateUnitLiteral`, i, node as StringLiteral, environment)
  else if (node.type === `Identifier`) return i.evaluator.call(`evaluateIdentifier`, i, node as Identifier, environment)
  else if (node.type === `BinaryExpression`) return i.evaluator.call(`evaluateBinaryExpression`, i, node as BinaryExpression, environment)
  else if (node.type === `CallExpression`) return i.evaluator.call(`evaluateCallExpression`, i, node as CallExpression, environment)
  else if (node.type === `IfExpression`) return i.evaluator.call(`evaluateIfExpression`, i, node as IfExpression, environment)
  //
  else if (node.type === `ExpressionStatement`) return i.evaluator.call(`evaluateExpressionStatement`, i, node as ExpressionStatement, environment)
  //
  else throw new Error(`Node type not implemented for interpretation/evaluation: ${node.type}`)
}

export const evaluateExpressionStatement: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, expressionStatement: ExpressionStatement, environment: Environment): EvaluationOutput => {
  return i.evaluator.evaluate(i, expressionStatement.expression, environment)
}

export const evaluateBinaryExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, binaryExpression: BinaryExpression, environment: Environment): RuntimeEvaluation => {
  const left = i.evaluator.evaluate(i, binaryExpression.left, environment)
  const right = i.evaluator.evaluate(i, binaryExpression.right, environment)

  // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
  if (!RuntimeEvaluation.isResolved(left) || !RuntimeEvaluation.isResolved(right)) return new RuntimeEvaluation(new BinaryExpression(left.toNode(i), binaryExpression.operator, right.toNode(i)))

  const operator = binaryExpression.operator.content

  const isAlgebraic = [`+`, `-`, `*`, `/`].includes(operator)
  const isLogical = [`=`, `!=`, `>`, `<`, `>=`, `<=`].includes(operator)

  let output: EvaluationOutput = undefined

  if (isLogical) return logicalBinaryOperation(left.runtimeValue, right.runtimeValue, operator).getEvaluation(binaryExpression)
  else if (isAlgebraic) {
    if (NumericValue.isNumericValue(left.runtimeValue)) {
      // ???
      if (StringValue.isStringValue(right.runtimeValue)) debugger

      // 1. Simple algebra with numbers
      if (NumericValue.isNumericValue(right.runtimeValue)) return numericAlgebraicOperation(left.runtimeValue, right.runtimeValue, operator).getEvaluation(binaryExpression)

      // 2. Try number x unknown algebraic operation (injectable)
      if (output === undefined) output = i.evaluator.call(`evaluateNumericAndOtherAlgebraicOperation`, left.runtimeValue, right.runtimeValue, operator)
    }
  }

  // 3. No clue about types, asks for custom (injectable) operations
  if (!output) output = i.evaluator.call(`evaluateCustomOperation`, left.runtimeValue, right.runtimeValue, operator, binaryExpression)

  // 4. Any time during the process a output could have been decided. If there is any, return it. If there is an UNRESOLVED output, send updated expression back
  if (output) {
    if (RuntimeValue.isRuntimeValue(output)) return output.getEvaluation(binaryExpression)
    if (RuntimeEvaluation.isResolved(output)) return output

    // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
    return new RuntimeEvaluation(new BinaryExpression(left.toNode(i), binaryExpression.operator, right.toNode(i)))
  }

  throw new Error(`BinaryExpression not implemented for types: "${left.runtimeValue.type}" and "${right.runtimeValue.type}"`)
}

export const evaluateIdentifier: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, identifier: Identifier, environment: Environment): RuntimeEvaluation => {
  const variableName = identifier.getVariableName()
  const value = environment.get(variableName)

  if (value === VARIABLE_NOT_FOUND) return new RuntimeEvaluation(identifier)
  return value.getEvaluation(identifier)
}

export const evaluateCallExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, callExpression: CallExpression, environment: Environment): RuntimeEvaluation => {
  const callee = callExpression.callee.getContent()
  const args = callExpression.arguments.map(argument => i.evaluator.evaluate(i, argument, environment))

  // 1. If some argument could not be evaluated bail out
  if (args.some(Node.isNode)) {
    const nodeArguments = args.map(arg => arg.toNode(i))
    return new RuntimeEvaluation(new CallExpression(callExpression.callee, nodeArguments))
  }

  // 2. If callee function implementation is missing, bail out
  const fn = environment.get(callee)
  if (fn === VARIABLE_NOT_FOUND) return new RuntimeEvaluation(callExpression)

  assert(FunctionValue.isFunctionValue(fn), `Callee does not correspond to a function in environment.`)

  debugger
  const value = fn.value(...args)
  return value
}

export const evaluateIfExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, ifExpression: IfExpression, environment: Environment): RuntimeEvaluation => {
  const condition = i.evaluator.evaluate(i, ifExpression.condition, environment)

  if (!RuntimeEvaluation.isResolved(condition)) {
    // return new RuntimeEvaluation(new IfExpression(condition.toNode(i), ifExpression.consequent, ifExpression.alternative))

    // TODO: Probably dont evaluate consequent/alternative here, for now its just for testing and debugging
    const consequent = i.evaluator.evaluate(i, ifExpression.consequent, environment)
    const alternative = i.evaluator.evaluate(i, ifExpression.alternative, environment)

    return new RuntimeEvaluation(new IfExpression(condition.toNode(i), consequent.toNode(i), alternative.toNode(i)))
  }

  let result: Nullable<boolean> = null

  if (BooleanValue.isBooleanValue(condition.runtimeValue)) result = condition.runtimeValue.value
  else if (NumericValue.isNumericValue(condition.runtimeValue)) result = condition.runtimeValue.value !== 0
  else if (StringValue.isStringValue(condition.runtimeValue)) debugger

  assert(result !== null, `Result cannot be null.`)

  if (result) return i.evaluator.evaluate(i, ifExpression.consequent, environment)
  else return i.evaluator.evaluate(i, ifExpression.alternative, environment)
}

// "PRIMITIVES"
//    Evaluations that ALWAYS return a runtime value

export const evaluateNumericLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, numericLiteral: NumericLiteral, environment: Environment): RuntimeEvaluation<NumericValue> =>
  new NumericValue(numericLiteral.getValue()).getEvaluation(numericLiteral)
export const evaluateStringLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, stringLiteral: StringLiteral, environment: Environment): RuntimeEvaluation<StringValue> =>
  new StringValue(String(stringLiteral.getValue())).getEvaluation(stringLiteral)
export const evaluateUnitLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, unitLiteral: UnitLiteral, environment: Environment): RuntimeEvaluation<UnitValue> =>
  new UnitValue(unitLiteral.unit).getEvaluation(unitLiteral)

// "INJECTABLES"
//    Evaluation positioned for easy override
export const evaluateNumericAndOtherAlgebraicOperation = (left: NumericValue, right: RuntimeValue<any>, operator: string): MaybeUndefined<RuntimeValue<any>> => {
  if (right.type === `unit` && operator === `*`) {
    const quantity = new Quantity(left.value, right.value)
    return new QuantityValue(quantity)
  }

  return undefined
}

export const evaluateCustomOperation = (left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string, node: Node): EvaluationOutput => {
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

function numericAlgebraicOperation(left: NumericValue, right: NumericValue, operator: string): NumericValue {
  let result: Nullable<number> = null

  if (operator === `+`) result = left.value + right.value
  else if (operator === `-`) result = left.value - right.value
  else if (operator === `*`) result = left.value * right.value
  else if (operator === `/`) result = left.value / right.value
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)

  return new NumericValue(result)
}

function logicalBinaryOperation(left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string): BooleanValue {
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

  return new BooleanValue(result)
}

// #endregion
