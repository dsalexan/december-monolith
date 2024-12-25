import { MaybeArray } from "tsdef"
import { isArray } from "lodash"

import { BinaryExpression, BooleanLiteral, Identifier, Node, NumericLiteral, StringLiteral } from "../tree"

export function isLiteral(node: Node): node is NumericLiteral | StringLiteral | BooleanLiteral | Identifier {
  return isNumericLiteral(node) || isStringLiteral(node) || isBooleanLiteral(node) || isIdentifier(node) || node.tags.includes(`literal`)
}

export function isBooleanLiteral(node: Node, value?: boolean): node is BooleanLiteral {
  if (node.type !== `BooleanLiteral`) return false

  if (value !== undefined) return (node as BooleanLiteral).getValue() === value
  return true
}

export function isNumericLiteral(node: Node, value?: number): node is NumericLiteral {
  if (node.type !== `NumericLiteral`) return false

  if (value !== undefined) return (node as NumericLiteral).getValue() === value
  return true
}

export function isStringLiteral(node: Node, value?: string): node is StringLiteral {
  if (node.type !== `StringLiteral`) return false

  if (value !== undefined) return (node as StringLiteral).getValue() === value
  return true
}

export function isIdentifier(node: Node, value?: string): node is Identifier {
  if (node.type !== `Identifier`) return false

  if (value !== undefined) return (node as Identifier).getVariableName() === value
  return true
}

export function isBinaryExpression(node: Node, operators?: MaybeArray<string>): node is BinaryExpression {
  if (node.type !== `BinaryExpression`) return false

  if (operators) {
    const operatorList = isArray(operators) ? operators : [operators]
    return operatorList.includes((node as BinaryExpression).operator.content)
  }

  return true
}
