/**
 * LEXICAL ANALYSIS
 * SCANNING
 *
 * Expression -> Tokenized Expression
 *
 * LEXEME: A sequence of characters in the source program that matches the pattern for a token and is identified by the lexical analyzer as an instance of that token.
 *         A "word"
 * LEXICAL TOKEN: is a string with an assigned and thus identified meaning
 */

import assert from "assert"
import Token from "../../token"
import LexicalGrammar from "../../type/grammar"
import { omit, orderBy, sortedIndex } from "lodash"

import churchill, { Block, paint, Paint } from "../../logger"
import Type from "../../type/base"
import { Lexeme } from "../../token/lexeme"
import { UNKNOWN } from "../../type/declarations/literal"
import Grammar from "../../type/grammar"
import { EvaluatorOptions } from "./evaluation"
import { TypeName } from "../../type/declarations/name"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

/**
 * Tokenizer — split expression into tokens (but, here, we are splitting into words) (a token is a word, or lexeme, AND a type, but whatever)
 * Scanner — split expression into lexemes (a lexeme is a string of characters AND a type)
 * Evaluater — produce a value (sometimes, most of the time the lexeme's string of characters is the value), and a value + lexeme is a lexicalToken
 */

/**
 * I HAVE 2 OPTIONS HERE
 *
 * A) First tokenize the text into strings of characters, before scanning them into lexemes
 * B) Iterate over each character, directly scanning them into lexemes when defining a suitable string of characters
 *
 * IT IS A)
 *    Why? Because shit like comments and whitespaces are (usually) removed from the "tape" before scanning
 *    In this (my) case, I'll split everything in whitespaces, and later join shit inside syntatic analysis
 */

export interface ScannerOptions {
  defaultLexemeType: TypeName
  logger?: typeof _logger
}

export type LexerOptions = ScannerOptions & EvaluatorOptions

interface ProtoToken {
  type: { name: `word` } | Type
  value: string
}

export default class Lexer {
  public options: Partial<LexerOptions>
  //
  public expression: string
  private cursor: number // current cursor position (index of character in expression)
  //
  public grammar: Grammar
  public tokens: Token[]

  constructor(grammar: LexicalGrammar) {
    this.grammar = grammar
  }

  /** Defaults options for lexer */
  _options(options: Partial<LexerOptions>) {
    return options
  }

  /** Process a source text into a list of lexical tokens */
  process(text: string, options: Partial<LexerOptions> = {}) {
    this._options(options) // default options

    this.expression = text
    this.tokens = []

    this._process()

    return this.tokens
  }

  /** Process expression into a list of lexical tokens */
  private _process() {
    /**
     * 1. Iterate over each character until we reach a valid sequence of characters that matches a lexeme
     *  1.A. There could be many lexemes matched from the same initial index. In these cases, match along the following rules:
     *    - Lowest Priority
     *    - Longest Match (biggest matching length)
     *  1.B. Lexemes are mandatorily split by any lexeme with id WHITESPACE (this is a convention, someday something that is not necessarely " " could have an id WHITESPACE)
     * 2. Evaluate the lexeme into a lexical token
     * 3. Add the lexical token to the list of tokens
     */

    const words = this._tokenize()

    this.cursor = 0
    // consume characters until the end of the expression
    for (const word of words) {
      const lexemes: Lexeme[] = []

      // if lexeme was already determined
      if (word.type.name !== `word`) {
        // build lexeme and add it to list
        const lexeme: Lexeme = { start: this.cursor, length: word.value.length, type: word.type }
        lexemes.push(lexeme)

        this.cursor += word.value.length // advance cursor
      }
      // if lexeme was not determined, it is a "generic" word
      //                               then scan word for lexemes
      else {
        const upTo = this.cursor + word.value.length
        do {
          const lexeme = this._lookhahead(upTo)

          // no lexeme was found, bail out // TODO: Never tested
          if (lexeme === null) debugger
          if (lexeme === null) break

          lexemes.push(lexeme)
        } while (this.cursor < upTo)
      }

      // i'm evaluating before scanning the next lexemes, there could be a use for this sort of thing
      //    or not, I could also just evaluate after scanning all lexemes
      for (const lexeme of lexemes) {
        const token = this._evaluate(lexeme)

        // TODO: Find out if there is a need to validate the token here (maybe against the list of already defined tokens?)

        this.tokens.push(token)
      }
    }
  }

  /** Split expression into words and "whitespace" tokens (sequence of characters that match a whitespace token, usually litereally just whitespaces) */
  private _tokenize(): ProtoToken[] {
    // 1) consume character by character into a sequence
    // 2) when a whitespace eligible character is found, start new sequence

    const tokens: ProtoToken[] = []

    let buffer: ProtoToken | null = null
    for (let i = 0; i < this.expression.length; i++) {
      let type: ProtoToken[`type`] = { name: `word` }

      const character = this.expression[i]

      // 1) determine token type for character
      const characterType = this.grammar.match(character, type => type.id === `whitespace`)
      if (!characterType.length) type = { name: `word` } // character is a word
      else type = characterType[0]

      // 2) if token type changed from buffer, start new token
      if (buffer === null) buffer = { type, value: `` }
      if (buffer!.type.name !== type.name) {
        tokens.push(buffer) // store buffer
        buffer = { type, value: `` } // reset buffer
      }

      // 3) append character to buffer
      buffer!.value = `${buffer!.value}${character}`
    }

    // store token if there is one
    if (buffer) tokens.push(buffer)

    return tokens
  }

  /** Scan words with lookahead (looking until a certain index, not the whole expression) */
  private _lookhahead(upTo: number): Lexeme | null {
    // https://cs.stackexchange.com/questions/155898/should-i-lookahead-in-the-lexer-or-parser
    // https://en.wikipedia.org/wiki/Maximal_munch

    const lexemes: Lexeme[] = []

    let i = this.cursor
    let sequence = ``

    do {
      const character = this.expression[i]
      sequence = `${sequence}${character}`

      // match sequence to token types
      const types = this.grammar.match(sequence)
      if (types.length) {
        // store lexemes by priority
        for (const type of types) {
          // const type = types[0]
          const lexeme = { start: this.cursor, length: sequence.length, type }
          lexemes.push(lexeme)
        }
      }
    } while (++i < upTo)

    // if no lexeme was found
    if (lexemes.length === 0) {
      /**
       * If no lexeme was found from (this.cursor) to (upTo), then maybe there is some unrecognized character at the start of the word
       *        word: slice of expression form this.cursor > upTo
       *
       * 1) Consume each character individually
       * 2) if character has no recognized type, return it as an unknown lexeme
       * 3) if character has a recognized type???
       */

      let j = this.cursor
      // consume each character in word
      do {
        const character = this.expression[j]

        // match character to token types
        const types = this.grammar.match(character)

        // if character has no recognized type, return it as an unknown lexeme
        if (types.length === 0) {
          const lexeme = { start: this.cursor, length: 1, type: UNKNOWN }
          lexemes.push(lexeme)

          break
        }

        // ERROR: if character has a recognized type???
        debugger
      } while (++j < upTo)

      if (lexemes.length === 0) debugger // ERROR: hOW?????
    }

    // determine lexeme
    const sorted = orderBy(lexemes, [`priority`, `length`], [`asc`, `desc`])
    const lexeme = sorted[0]

    // advance cursor
    this.cursor += lexeme.length

    return lexeme
  }

  private _evaluate(lexeme: Lexeme) {
    const token = new Token(this, lexeme)

    // evaluate lexeme into token
    token.evaluate(this.options)

    return token
  }

  // #region DEBUG

  print() {
    const logger = _logger

    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`TOKENIZED EXPRESSION`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    logger.add(paint.gray(this.expression)).info()
    console.log(` `)

    // PRINT EACH TOKEN INLINE
    for (const token of this.tokens) {
      const isWhitespace = token.lexeme.match(/^\s+$/)

      let color = isWhitespace ? paint.bgGrey : paint.white

      if (token.type.name === `unknown`) color = isWhitespace ? paint.bgYellow : paint.yellow
      else if (token.type.id === `literal`) color = isWhitespace ? paint.bgBlue : paint.blue
      else if (token.type.id === `separator`) color = isWhitespace ? paint.bgGreen : paint.green
      else if (token.type.id === `operator`) color = isWhitespace ? paint.bgWhite : paint.white

      logger.add(color(token.lexeme))
    }

    logger.info()

    // PRINT EACH TOKEN
    for (const token of this.tokens) {
      logger.add(paint.grey(``))

      let lexeme = token.lexeme

      let lexemeColor = paint.white
      if (lexeme.match(/^\s+$/)) lexemeColor = paint.bgWhite

      logger.add(lexemeColor(token.lexeme))
      logger.add(paint.grey(`, `))

      let color = paint.grey

      if (token.type.name === `unknown`) color = paint.yellow
      else if (token.type.id === `literal`) color = paint.blue
      else if (token.type.id === `separator`) color = paint.green
      else if (token.type.id === `operator`) color = paint.white

      logger.add(color.bold(token.type.id))
      logger.add(paint.grey(`:`))
      logger.add(color(token.type.name))

      logger.add(paint.grey(`, `))

      logger.add(paint.white(token.interval.start))
      logger.add(paint.grey(`:`))
      logger.add(paint.white(token.interval.end))

      logger.add(paint.grey(`, `))

      logger.info()
    }
  }

  // #endergion
}
