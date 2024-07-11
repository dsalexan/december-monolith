import type { TokenTypeName } from "."
import type Token from ".."
import { Lexeme, TokenAttributes } from ".."
import { TokenPattern } from "./pattern"

export interface EvaluatorOptions {}

export type EvaluateFunction = (token: Token, options: EvaluatorOptions) => Partial<TokenAttributes>

export type TokenTypeID = `literal` | `whitespace` | `separator` | `operator`

export default class TokenType {
  public id: TokenTypeID
  public name: TokenTypeName

  public pattern: TokenPattern
  public priority: number
  public evaluate: EvaluateFunction

  // debug/printing shit
  public prefix: string

  constructor(id: TokenTypeID, name: TokenTypeName, pattern: TokenPattern, priority: number, evaluate?: EvaluateFunction) {
    this.id = id
    this.name = name

    this.pattern = pattern
    this.priority = priority
    this.evaluate = evaluate ?? ((token: Token, options: EvaluatorOptions) => ({ value: token.lexeme }))
  }

  makeLexeme(start: number, length: number): Lexeme {
    const lexeme: Lexeme & { priority: number } = { start, length, name: this.name, priority: this.priority }

    return lexeme
  }
}
