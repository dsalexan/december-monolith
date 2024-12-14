import type Interpreter from ".."

import { BinaryExpression, CallExpression, ExpressionStatement, Identifier, IfStatement, Node, NodeType, NumericLiteral, Statement, StringLiteral } from "../../tree"

import { Environment, EvaluationFunction, RuntimeValue } from ".."
import { evaluateBinaryExpression, evaluateCallExpression, evaluateIdentifier, evaluateNumericLiteral, evaluateStringLiteral, evaluateUnitLiteral } from "./expressions"
import { evaluateExpressionStatement, evaluateIfStatement } from "./statements"

export const evaluate: EvaluationFunction = (i: Interpreter, node: Node, environment: Environment): RuntimeValue<any> | Node => {
  if (node.type === `NumericLiteral`) return evaluateNumericLiteral(i, node as NumericLiteral, environment)
  else if (node.type === `StringLiteral`) return evaluateStringLiteral(i, node as StringLiteral, environment)
  else if (node.type === `UnitLiteral`) return evaluateUnitLiteral(i, node as StringLiteral, environment)
  else if (node.type === `Identifier`) return evaluateIdentifier(i, node as Identifier, environment)
  else if (node.type === `BinaryExpression`) return evaluateBinaryExpression(i, node as BinaryExpression, environment)
  else if (node.type === `CallExpression`) return evaluateCallExpression(i, node as CallExpression, environment)
  //
  else if (node.type === `ExpressionStatement`) return evaluateExpressionStatement(i, node as ExpressionStatement, environment)
  else if (node.type === `IfStatement`) return evaluateIfStatement(i, node as IfStatement, environment)
  //
  else throw new Error(`Node type not implemented for interpretation/evaluation: ${node.type}`)
}
