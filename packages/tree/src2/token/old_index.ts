import { Lexeme } from "./lexeme"
import { TypeName } from "../type/declarations/name"
import { Attributes } from "./attributes"
/**
 * | Token name                                                                                                    | Explanation                                            | Sample token values                                |
 * | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
 * | [identifier](https://en.wikipedia.org/wiki/Identifier_(computer_languages) "Identifier (computer languages)") | Names assigned by the programmer.                      | `x`, `color`, `UP`                                 |
 * | [keyword](https://en.wikipedia.org/wiki/Reserved_word "Reserved word")                                        | Reserved words of the language.                        | `if`, `while`, `return`                            |
 * | [separator/punctuator](https://en.wikipedia.org/wiki/Delimiter "Delimiter")                                   | Punctuation characters and paired delimiters.          | `}`, `(`, `;`                                      |
 * | [operator](https://en.wikipedia.org/wiki/Operator_(computer_programming) "Operator (computer programming)")   | Symbols that operate on arguments and produce results. | `+`, `<`, `=`                                      |
 * | [literal](https://en.wikipedia.org/wiki/Literal_(computer_programming) "Literal (computer programming)")      | Numeric, logical, textual, and reference literals.     | `true`, `6.02e23`, `"music"`                       |
 * | [comment](https://en.wikipedia.org/wiki/Comment_(computer_programming) "Comment (computer programming)")      | Line or block comments. Usually discarded.             | ` Retrieves user data `, `// must be negative` |
 * | [whitespace](https://en.wikipedia.org/wiki/Whitespace_character "Whitespace character")                       | Groups of non-printable characters. Usually discarded. | –                                                  |
 *
 */

import type Lexer from "../phases/lexer"
import assert from "assert"
import { EvaluatorOptions } from "../phases/lexer/evaluation"
import Grammar from "../type/grammar"
import { Interval } from "@december/utils"
import { cloneDeep } from "lodash"

/**
 * IDENTIFIER — basically a variable
 * KEYWORD — reserved words of the language (while, for, etc...); shit that can't be a variable, that IS NOT ALLOWED to be a variable
 * SEPARATOR — ponctuation character (| , ;) or delimiters () [] {}
 * OPERATOR — symbols that operate on arguments, kind of like keywords
 * LITERAL — shit that carry a intrinsic value (boolean, strings, numbers, etc...)
 * COMMENT — shit to be discarded
 * WHITESPACE — catch all name for stuff that should be disregarded by the compiler, like most whitespaces (here we don't discard it immediately, since it could be inside a string or something idk)
 *              OR, MAYBE, we just discard whitespaces ALWAYS. there could be a convention that a list of literals are ALWAYS separated by whitespaces
 *              In any case, anything inside this category effectively separates lexical tokens (so it is somewhat useful to find lexemes)
 */

export const NON_EVALUATED_LEXICAL_TOKEN = Symbol.for(`NON_EVALUATED_LEXICAL_TOKEN`)

export default class Token<TValue = any> {
  private lexer: Lexer
  private _grammar: Grammar
  private _expression: string
  //
  private _interval: Interval
  private _type: TypeName

  // evaluated attributes from base lexeme during evaluation
  private _attributes: Partial<Attributes<TValue>> | typeof NON_EVALUATED_LEXICAL_TOKEN = NON_EVALUATED_LEXICAL_TOKEN

  // #region GETTERS and SETTERS

  /** Returns initial character of lexeme in original expression */
  public get start() {
    return this._interval.start
  }

  /** Returns interval (initial and final indexes) of lexeme in original expression */
  public get interval() {
    return this._interval
  }

  private get expression() {
    return this._expression ?? this.lexer.expression
  }

  public get lexeme(): string {
    return this.substring(this._interval.start, this._interval.length)
  }

  public get grammar(): Grammar {
    return this._grammar ?? this.lexer.grammar
  }

  public get type() {
    return this.grammar.get(this._type)!
  }

  public get attributes(): Attributes<TValue> {
    if (typeof this._attributes === `symbol` && this._attributes === NON_EVALUATED_LEXICAL_TOKEN) throw new Error(`Token not evaluated yet`)

    return this._attributes as Attributes<TValue>
  }

  public get value(): TValue {
    const value = this.attributes[`value`]

    return value as TValue
  }

  // #endregion

  constructor(lexerOrGrammar: Lexer | Grammar, lexeme: Lexeme) {
    if (lexerOrGrammar instanceof Grammar) this._grammar = lexerOrGrammar
    else this.lexer = lexerOrGrammar

    this._interval = Interval.fromLength(lexeme.start, lexeme.length)
    this._type = lexeme.type.name
  }

  private substring(start: number, length: number, strict = true) {
    if (strict) {
      assert(start >= 0 && start < this.expression.length, `Invalid start index`)
      assert(length >= 0, `Invalid length`)
      assert(length <= this.expression.length - start, `Invalid length`)
    }

    return this.expression.slice(start, start + length)
  }

  updateExpression(expression: string) {
    this._expression = expression
  }

  updateInterval(interval: Interval) {
    this._interval = interval
  }

  _evaluateOptions(options: Partial<EvaluatorOptions>) {
    // TODO: Default options-
    return options
  }

  /** Evaluates attributes (like value) from lexeme */
  evaluate(_options: Partial<EvaluatorOptions> = {}) {
    const options = this._evaluateOptions(_options)

    assert(this.type, `Token type not set`)

    this._attributes = this.type.lexical!.evaluate(this, options) ?? {}
  }

  clone(lexeme?: Lexeme, attributes?: Partial<Attributes<TValue>>) {
    lexeme ??= { start: this.interval.start, length: this.interval.length, type: { name: this._type } as any }

    const token = new Token(this.lexer ?? this._grammar, lexeme)
    token._expression = this._expression

    token._attributes = cloneDeep(attributes ?? this._attributes)

    return token
  }

  toString() {
    return `"${this.lexeme}" ${this._interval}`
  }
}