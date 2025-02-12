import { TokenKind } from "../kind"

export interface IToken<TKind extends string = TokenKind> {
  readonly type: `artificial` | `lexical`
  //
  readonly kind: TKind
  readonly content: string // substring of original expression OR a string expression of artificial token

  clone(): IToken<TKind>
  toString(): string
}

export interface TokenCloneOptions {}
