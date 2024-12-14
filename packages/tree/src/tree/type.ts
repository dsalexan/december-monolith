import { paint, Paint, Block } from "../logger"

export const NODE_TYPES = [
  // STATEMENTS
  `ExpressionStatement`,
  // EXPRESSIONS
  `MemberExpression`,
  `CallExpression`,
  `BinaryExpression`,
  `PrefixExpression`,
  `IfExpression`,
  // LITERALS
  `BooleanLiteral`,
  `NumericLiteral`,
  `StringLiteral`,
  `Identifier`,
  `UnitLiteral`,
] as const

export type NodeType = (typeof NODE_TYPES)[number]

export const NODE_TYPE_PREFIX: Record<NodeType, string> = {
  ExpressionStatement: `ex`,
  //
  MemberExpression: `m`,
  CallExpression: `c`,
  BinaryExpression: `o`,
  PrefixExpression: `p`,
  IfExpression: `if`,
  //
  BooleanLiteral: `b`,
  NumericLiteral: `n`,
  StringLiteral: `s`,
  Identifier: `i`,
  UnitLiteral: `u`,
}

export const NODE_TYPE_COLOR = {
  NumericLiteral: paint.blue,
  StringLiteral: paint.blue,
  Identifier: paint.magenta,
  UnitLiteral: paint.magenta,
} as Record<NodeType, Paint>
