import { TokenKind } from "../kind"

export interface IToken {
  readonly type: `artificial` | `lexical`
  //
  readonly kind: TokenKind
  readonly content: string // substring of original expression OR a string expression of artificial token

  clone(): IToken
  toString(): string
}
