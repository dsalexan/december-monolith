/** A LEXEME is extracted from the original string expression.
 *
 * It is usually a pair of LexicalCategory and the interval of characters
 *
 * A LEXEME IS A STRING OF CHARACTERS KNOWN TO BE OF A CERTAIN CATEGORY
 */

import { isString } from "lodash"
import { getTokenKind, TokenKind, TokenKindName } from "./kind"

export class Lexeme {
  public kind: TokenKind
  //
  public expression: string // original expression
  public start: number // index of starting character for sequence of characters that matches the lexeme
  public length: number // number of characters in sequence

  constructor(kind: TokenKind | TokenKindName, expression: string, start: number, length: number) {
    this.kind = isString(kind) ? getTokenKind(kind) : kind
    this.expression = expression
    this.start = start
    this.length = length
  }

  get content() {
    return this.expression.slice(this.start, this.start + this.length)
  }

  public clone() {
    return new Lexeme(this.kind, this.expression, this.start, this.length)
  }
}
