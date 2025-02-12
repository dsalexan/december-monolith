/** A LEXEME is extracted from the original string expression.
 *
 * It is usually a pair of LexicalCategory and the interval of characters
 *
 * A LEXEME IS A STRING OF CHARACTERS KNOWN TO BE OF A CERTAIN CATEGORY
 */

import { cloneDeep, isString } from "lodash"
import { TokenKind, TokenCategory } from "./kind"
import assert from "assert"

export class Lexeme<TKind extends string = TokenKind> {
  public kind: TKind
  public category: TokenCategory
  //
  public expression: string // original expression
  public start: number // index of starting character for sequence of characters that matches the lexeme
  public length: number // number of characters in sequence

  constructor(kind: TKind, category: TokenCategory, expression: string, start: number, length: number) {
    this.kind = kind
    this.category = category

    this.expression = expression
    this.start = start
    this.length = length
  }

  get content() {
    return this.expression.slice(this.start, this.start + this.length)
  }

  public clone(): this {
    return new Lexeme(this.kind, this.category, this.expression, this.start, this.length) as this
  }
}
