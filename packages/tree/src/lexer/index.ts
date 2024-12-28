/**
 *
 * A LEXER will have 3 stages
 *
 * 1. Split
 *      Split expression in words
 *
 * 2. Scan
 *      Parse words into lexemes (attributing a KIND to a sequence of characters, words)
 *
 * 3. Evaluate
 *      Derive value from lexemes, constructing a TOKEN (LexicalToken to be exact)
 */

import { Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import LexicalGrammar, { LexicalGrammarMatch, LexicalGrammarEntry, LexicalGrammarCustomTest, LexicalTestOptions } from "./grammar"

import { LexicalToken, Token } from "../token/core"
import { getTokenKind, getTokenKindBlocks, getTokenKindColor, TokenKind } from "../token/kind"
import { Lexeme } from "../token/lexeme"

export { default as LexicalGrammar, LexicalGrammarEntry, LexicalGrammarCustomTest, LexicalTestOptions, DEFAULT_GRAMMAR } from "./grammar"
export type { LexicalGrammarMatch } from "./grammar"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface LexerOptions extends LexicalTestOptions {
  logger: typeof _logger
}

export default class Lexer {
  public options: LexerOptions
  //
  private grammar: LexicalGrammar
  private expression: string
  //
  private cursor: number // current cursor position (index of character in expression)
  //
  public tokens: LexicalToken[]

  public process(grammar: LexicalGrammar, expression: string, options: WithOptionalKeys<LexerOptions, `logger`>): LexicalToken[] {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    }

    this.grammar = grammar
    this.expression = expression

    this.cursor = 0
    this.tokens = []

    global.__LEXER_EXPRESSION = this.expression

    const words = Lexer.split(this.expression)
    this.tokens = this.scan(words)

    return this.tokens
  }

  /** Split expression into words */
  public static split(expression: string): Word[] {
    // 1) consume character by character into a sequence
    // 2) when a whitespace eligible character is found, start new sequence

    /**
     * THIS IS DONE TO FACILITATE LOOKAHEAD
     *
     * When spliting the lexemes, we take a whole word (separated by whitespaces) in consideration to determine the lexemes
     */

    const words: Word[] = []

    let word: Nullable<Word> = null
    for (let i = 0; i < expression.length; i++) {
      let char = expression[i]

      // 1. Check if character is a whitespace first (since whitespaces break words)
      const isWhitespace = /\s/.test(char)
      let kind: Word[`kind`] = isWhitespace ? `whitespace` : `word`

      // 2. Check if two consecutive colons (::) are found
      if (char === `:` && expression[i + 1] === `:`) {
        kind = `double_colon`
        i++ // skip next colon
        char = `${char}${expression[i]}` // update slice
      }

      // 3. If char is of a different kind than buffered word, push buffer to list and reset it
      //      (ignore this if buffer is empty)
      if (word !== null && word.kind !== kind) {
        words.push(word)
        word = null
      }

      // 3. Initialize a "empty word", with the same type as current char (ONLY IF NECESSARY)
      if (word === null) word = { kind, content: `` }

      // 4. Append char to buffer
      word.content = `${word.content}${char}`
    }

    // 5. Push final word to list
    if (word) words.push(word)

    const length = sum(words.map(word => word.content.length))
    assert(length === expression.length, `Expression length was not reached`)

    return words
  }

  /** Scan (parse) words into lexemes (attribute a TokenKind to a sequence of characters) */
  private scan(words: Word[]): LexicalToken[] {
    /**
     * 1. Iterate over each character until we reach a valid sequence of characters that matches a lexeme
     *  1.A. There could be many lexemes matched from the same initial index. In these cases, match along the following rules:
     *    - Lowest Priority
     *    - Longest Match (biggest matching length)
     *  1.B. Lexemes are mandatorily split by any lexeme with id WHITESPACE (this is a convention, someday something that is not necessarely " " could have an id WHITESPACE)
     * 2. Evaluate the lexeme into a lexical token
     * 3. Add the lexical token to the list of tokens
     */

    const lexemes: LexemeAndMatch[] = []

    this.cursor = 0
    // consume characters until the end of expression (well, actually the end of the last word)
    //    (loop through every word extracted from expression)
    for (const word of words) {
      // a WORD can be broken into many lexemes

      // 1. Word kind was defined by spliting
      if (word.kind !== `word`) {
        lexemes.push({
          lexeme: new Lexeme(word.kind, this.expression, this.cursor, word.content.length),
          match: { priority: Infinity, kind: getTokenKind(word.kind), data: {} }, // artifical match
        })

        // advance cursor
        this.cursor += word.content.length
      }
      // 2. Match word kind through grammar (using lookahead in word)
      //        if (word.kind === `word`) {
      else {
        // scan word for lexemes using lookahead

        const upTo = this.cursor + word.content.length // final index of word in expression
        // loop until we reach the end of the word
        do {
          const lexeme: Nullable<LexemeAndMatch> = this._lookahead(upTo)

          // no lexeme was found, bail out // TODO: Never tested
          if (lexeme === null) {
            debugger
            break
          }

          lexemes.push(lexeme) // push lexeme to list
          this.cursor += lexeme.lexeme.length // advance cursor
        } while (this.cursor < upTo)
      }
    }

    // 3. Test if lengths are maintained
    const length = sum(lexemes.map(lexeme => lexeme.lexeme.length))
    assert(length === this.expression.length, `Expression length was not reached`)

    // 4. Assemble tokens
    const tokens: LexicalToken[] = []

    for (const { match, lexeme } of lexemes) {
      assert(match !== null || [`unknown`], `Only unknown tokens can have a "null" match`)

      const token = new LexicalToken(lexeme)
      tokens.push(token)
    }

    return tokens
  }

  /** Returns the next lexeme in expression (looking up to a certain index) */
  private _lookahead(upTo: number): Nullable<LexemeAndMatch> {
    // https://cs.stackexchange.com/questions/155898/should-i-lookahead-in-the-lexer-or-parser
    // https://en.wikipedia.org/wiki/Maximal_munch

    /**
     * This "upTo" index is determined by the boundaries of all the words in the original expression
     * This words are split by Lexer.split, that separates words and whitespaces
     * This lookahead function consideres the current cursor to the final of a word to match possible lexemes
     */

    type ProtoLexeme = { match: LexicalGrammarMatch; start: number; length: number }
    const possibilities: ProtoLexeme[] = []

    let i = this.cursor
    let sequence = ``

    // 1. Try ALL possible sequences starting from cursor

    // consume each character of a word (starting by the cursor)
    do {
      const char = this.expression[i]
      sequence = `${sequence}${char}` // append char to buffered sequence of characters ("string")

      // Match sequence in grammar
      const matches = this.grammar.match(sequence, this.options)
      possibilities.push(...matches.map(match => ({ match, start: this.cursor, length: sequence.length })))
    } while (++i < upTo)

    // 2. "Discard" unknown character-lexemes to allow for partial matchings starting beyond cursor
    //      (mostly useful for developing incomplete grammars)

    // if no possible lexemes were found (just by matching progressively possible sequences in word)
    if (possibilities.length === 0) {
      /**
       * If no lexeme was found from (this.cursor) to (upTo), then maybe there is some unrecognized character at the start of the word
       *        word: slice of expression form this.cursor > upTo
       *
       * 1) Consume each character individually
       * 2) if character has no recognized type, return it as an unknown lexeme
       * 3) if character has a recognized type???
       */

      i = this.cursor
      do {
        const char = this.expression[i]
        const matches = this.grammar.match(char, this.options)
        // no match, discard character-lexeme
        if (matches.length === 0) {
          possibilities.push({ match: NO_MATCH_DISCARD_UNKNOWN_CHARACTER, start: i, length: 1 })
          break
        }

        debugger // TODO: Valid match found, what to do?
      } while (++i < upTo)
    }

    assert(possibilities.length > 0, `No lexemes were found`)

    // 3. Sort possibilities by length (bigger is better) and priority (lower is worse)
    const sorted = orderBy(possibilities, [`match.priority`, `length`], [`desc`, `desc`])
    const lexeme = sorted[0]

    return {
      lexeme: new Lexeme(lexeme.match.kind, this.expression, lexeme.start, lexeme.length),
      match: lexeme.match,
    }
  }

  public print() {
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
      const color = getTokenKindColor(token.kind) ?? paint.grey
      logger.add(color(token.content))
    }
    logger.info()

    // PRINT EACH TOKEN AS A LIST
    for (const token of this.tokens) {
      logger.add(paint.grey(``))

      // 1. Token content
      const content = token.kind.name === `whitespace` ? paint.bgGray : paint.white
      logger.add(content(token.content), ` `)

      // 2. Token kind
      const color = getTokenKindColor(token.kind, true) ?? paint.bgRed.white.bold
      logger.add(
        ...color(...getTokenKindBlocks(token.kind)), //
        paint.grey(` `),
        paint.grey.dim(token.getInterval().toString()),
      )

      logger.info()
    }
  }
}

export interface Word {
  content: string
  kind: `word` | `whitespace` | `double_colon`
}

export const NO_MATCH_DISCARD_UNKNOWN_CHARACTER: LexicalGrammarMatch = {
  priority: -Infinity,
  kind: getTokenKind(`unknown`),
  data: null as any,
}

export type LexemeAndMatch = { lexeme: Lexeme; match: LexicalGrammarMatch }
