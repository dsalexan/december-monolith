import { Interval } from "@december/utils"

import { Lexeme } from "./lexeme"
import { Attributes } from "./attributes"
import { cloneString, ConcreteString, ProvidedString } from "../string"
import Type from "../type/base"
import assert from "assert"
import { EvaluatorOptions } from "../phases/lexer/evaluation"
import { cloneDeep } from "lodash"
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
  private string: ProvidedString | ConcreteString
  //
  public type: Type
  protected _interval: Interval | null
  public get interval() {
    assert(this._interval, `Interval must be set for a token`)

    return this._interval
  }

  public updateInterval(interval: Interval) {
    this._interval = interval
  }

  public updateString(string: ProvidedString | ConcreteString) {
    this.string = string
  }

  public setType(type: Type) {
    this.type = type

    return this
  }

  // evaluated attributes from base lexeme during evaluation
  private _attributes: Partial<Attributes<TValue>> | typeof NON_EVALUATED_LEXICAL_TOKEN = NON_EVALUATED_LEXICAL_TOKEN
  public get attributes(): Attributes<TValue> {
    if (typeof this._attributes === `symbol` && this._attributes === NON_EVALUATED_LEXICAL_TOKEN) throw new Error(`Token not evaluated yet`)

    return this._attributes as Attributes<TValue>
  }

  public setAttributes(attributes: Partial<Attributes<TValue>>) {
    this._attributes = attributes
  }

  public get isNonEvaluated() {
    return this._attributes === NON_EVALUATED_LEXICAL_TOKEN
  }

  get provider() {
    return this.string.type === `concrete` ? null : this.string.provider
  }

  get signature() {
    return this.string.type === `concrete` ? null : this.string.provider.signature
  }

  get lexeme(): string {
    if (this.string.type === `concrete`) return this.string.value
    return this.string.provider.value.slice(this.string.start, this.string.start + this.string.length)
  }

  constructor(string: ProvidedString | ConcreteString, type: Type) {
    this.string = string
    this.type = type

    // Concrete strings dont have intervals. They must be defined later, by calling recalculate() in a SubTree context

    if (this.string.type === `provided`) this._interval = Interval.fromLength(this.string.start, this.string.length)
  }

  /** Evaluates attributes (like value) from lexeme */
  evaluate(options: EvaluatorOptions) {
    assert(this.type, `Token type not set`)

    const evaluate = this.type.lexical === undefined ? options.fallbackEvaluator! : this.type.lexical!.evaluate

    this._attributes = evaluate(this, options) ?? {}
  }

  clone(attributes?: Partial<Attributes<TValue>>) {
    const token = new Token(cloneString(this.string), this.type)
    token._interval = this._interval
    token._attributes = cloneDeep(attributes ?? this._attributes)

    return token
  }

  toString() {
    return `"${this.lexeme}" ${this.interval.toString()}`
  }
}
