import { paint, Paint, Block } from "../logger"

export const NODE_TYPES = [
  // STATEMENTS
  `ExpressionStatement`,
  `IfStatement`,
  // EXPRESSIONS
  `MemberExpression`,
  `CallExpression`,
  `BinaryExpression`,
  `PrefixExpression`,
  // LITERALS
  `Property`,
  `NumericLiteral`,
  `StringLiteral`,
  `Identifier`,
] as const

export type NodeType = (typeof NODE_TYPES)[number]

export const NODE_TYPE_PREFIX: Record<NodeType, string> = {
  ExpressionStatement: `ex`,
  IfStatement: `if`,
  //
  MemberExpression: `m`,
  CallExpression: `c`,
  BinaryExpression: `o`,
  PrefixExpression: `u`,
  //
  Property: `p`,
  NumericLiteral: `n`,
  StringLiteral: `s`,
  Identifier: `i`,
}

export const NODE_TYPE_COLOR = {
  NumericLiteral: paint.blue,
  StringLiteral: paint.blue,
  Identifier: paint.magenta,
} as Record<NodeType, Paint>
