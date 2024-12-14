import { Nullable } from "tsdef"
import assert from "assert"

import { Token } from "../../token/core"
import { BinaryExpression, CallExpression, ExpressionStatement, Identifier, Node, NumericLiteral } from "../../tree"

import { NumericValue, RuntimeValue } from "../valueTypes"
import Environment from "../environment"
import type Interpreter from ".."
import { EvaluationFunction } from ".."

export const evaluateExpressionStatement: EvaluationFunction = (i: Interpreter, expressionStatement: ExpressionStatement, environment: Environment): RuntimeValue<any> | Node => {
  return i.evaluate(i, expressionStatement.expression, environment)
}
