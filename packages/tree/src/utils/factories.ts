import { ArtificialToken } from "../token"
import { Token } from "../token/core"
import { TokenCategory, TokenKind } from "../token/kind"
import { Identifier, Node, NodeType, NumericLiteral, StringLiteral } from "../tree"

// export function getClass(type: NodeType): Node {
//   if (type === `NumericLiteral`) return NumericLiteral
//   else if (type === `StringLiteral`) return StringLiteral

//   throw new Error(`Not implemented type "${type}"`)
// }

export function makeToken(value: string, kind: TokenKind = `string`): ArtificialToken {
  return new ArtificialToken(kind, value)
}

export function makeConstantLiteral(value: number): NumericLiteral
export function makeConstantLiteral(value: string): StringLiteral
export function makeConstantLiteral(value: number | string): NumericLiteral | StringLiteral {
  if (typeof value === `number`) return new NumericLiteral(new ArtificialToken(`number`, String(value)))
  else if (typeof value === `string`) return new StringLiteral(new ArtificialToken(`string`, value))

  throw new Error(`Not implemented for value "${value}"`)
}

export function makeIdentifier(name: string): Node {
  return new Identifier(new ArtificialToken(`string`, name))
}

export function artificialize(token: Token) {
  return new ArtificialToken(token.kind as any, token.content)
}

export function artificializeTree(node: Node): true {
  node.tokens = node.tokens.map(token => artificialize(token))

  for (const child of node.children) artificializeTree(child)

  return true
}
