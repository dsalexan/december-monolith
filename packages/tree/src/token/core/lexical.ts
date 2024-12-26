/**
 * A LEXICAL TOKEN is created from a LEXEME during the lexical analysis phase.
 *
 * A LEXICAL TOKEN IS LEXEME + VALUE
 *  (Lexeme: set of characters known to be of a certain kind)
 */

import { Interval } from "@december/utils"
import { TokenKind } from "../kind"
import { Lexeme } from "../lexeme"
import { IToken, TokenCloneOptions } from "./base"

export default class LexicalToken implements IToken {
  public readonly type: `lexical` = `lexical`
  //
  public readonly lexeme: Lexeme
  //
  public get kind() {
    return this.lexeme.kind
  }
  public get content() {
    return this.lexeme.expression.slice(this.lexeme.start, this.lexeme.start + this.lexeme.length)
  }

  constructor(lexeme: Lexeme) {
    this.lexeme = lexeme
  }

  /** Returns interval from lexeme */
  public getInterval() {
    return Interval.fromLength(this.lexeme.start, this.lexeme.length)
  }

  clone(options: TokenCloneOptions = {}): this {
    const token = new LexicalToken(this.lexeme.clone())

    return token as this
  }

  toString() {
    return `"${this.content}" ${this.getInterval().toString()}`
  }
}
