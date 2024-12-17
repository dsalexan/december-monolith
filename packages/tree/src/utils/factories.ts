import { ArtificialToken, getTokenKind } from "../token"
import { Token } from "../token/core"
import { Node, NodeType, NumericLiteral, StringLiteral } from "../tree"

// export function getClass(type: NodeType): Node {
//   if (type === `NumericLiteral`) return NumericLiteral
//   else if (type === `StringLiteral`) return StringLiteral

//   throw new Error(`Not implemented type "${type}"`)
// }

export function makeConstantLiteral(value: number): NumericLiteral
export function makeConstantLiteral(value: string): StringLiteral
export function makeConstantLiteral(value: number | string): NumericLiteral | StringLiteral {
  if (typeof value === `number`) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), String(value)))
  else return new StringLiteral(new ArtificialToken(getTokenKind(`string`), value))
}

export function artificialize(token: Token) {
  return new ArtificialToken(token.kind, token.content)
}

export function artificializeTree(node: Node): true {
  node.tokens = node.tokens.map(token => artificialize(token))

  for (const child of node.children) artificializeTree(child)

  return true
}
