import ArtificialToken from "./artificial"
import LexicalToken from "./lexical"

export { default as LexicalToken } from "./lexical"
export { default as ArtificialToken } from "./artificial"

export type { IToken } from "./base"

export type Token = LexicalToken | ArtificialToken
export type TokenType = Token[`type`]

export function isLexicalToken(token: Token): token is LexicalToken {
  return token.type === `lexical`
}

export function isArtificialToken(token: Token): token is ArtificialToken {
  return token.type === `artificial`
}
