import { Nullable } from "tsdef"
import assert from "assert"

import { Token } from "../../token/core"
import { BinaryExpression, CallExpression, ExpressionStatement, Identifier, IfStatement, Node, NumericLiteral } from "../../tree"

import { NumericValue, parseRuntimeValueToExpression, RuntimeValue } from "../valueTypes"
import Environment from "../environment"
import type Interpreter from ".."
import { EvaluationFunction } from ".."

export const evaluateExpressionStatement: EvaluationFunction = (i: Interpreter, expressionStatement: ExpressionStatement, environment: Environment): RuntimeValue<any> | Node => {
  return i.evaluate(i, expressionStatement.expression, environment)
}

export const evaluateIfStatement: EvaluationFunction = (i: Interpreter, ifStatement: IfStatement, environment: Environment): RuntimeValue<any> | Node => {
  const condition = i.evaluate(i, ifStatement.condition, environment)
  if (Node.isNode(condition)) {
    // TODO: Probably dont evaluate consequent/alternative here, for now its just for testing and debugging
    const consequentEvaluation = i.evaluate(i, ifStatement.consequent, environment)
    const alternativeEvaluation = i.evaluate(i, ifStatement.alternative, environment)

    const consequentNode = Node.isNode(consequentEvaluation) ? consequentEvaluation : parseRuntimeValueToExpression(consequentEvaluation)
    const alternativeNode = Node.isNode(alternativeEvaluation) ? alternativeEvaluation : parseRuntimeValueToExpression(alternativeEvaluation)

    return new IfStatement(condition, consequentNode, alternativeNode)
  }

  let result: Nullable<boolean> = null

  if (condition.type === `boolean`) result = condition.value
  else if (condition.type === `number`) result !== 0
  else if (condition.type === `string`) debugger

  assert(result !== null, `Result cannot be null.`)

  if (result) return i.evaluate(i, ifStatement.consequent, environment)
  else return i.evaluate(i, ifStatement.alternative, environment)
}
