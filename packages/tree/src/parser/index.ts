/**
 * Here we have the PARSER, or Syntatic Analysis
 *
 * Effectively we parse tokens into an Abstract Syntax Tree (AST).
 * Each token is analysed following some rules (grammar rules?) to decide how it's node should be inserted into the existing tree
 */

import { AnyObject, MaybeArray, MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { isArray, orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { TokenKind, LexicalToken, Token } from "../token"

import { SyntacticalGrammar } from "./grammar"
import { DEFAULT_BINDING_POWERS } from "./grammar/default"

import { Node, NodeType, Statement, ExpressionStatement } from "../tree"
import { SyntacticalContext } from "./grammar/parserFunction"
import { InjectionData } from "../lexer"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { BindingPower, SyntacticalGrammar, DEFAULT_GRAMMAR, createTransformNodeEntry } from "./grammar"
export { SyntacticalContext, StatementParser, NUDParser, LEDParser } from "./grammar/parserFunction"
export { createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "./grammar/entries"

export interface ParserOptions {
  logger: typeof _logger
  syntacticalContext: SyntacticalContext
}

export default class Parser<TGrammarDict extends AnyObject = any, TKind extends string = TokenKind> {
  public options: ParserOptions
  //
  public grammar: SyntacticalGrammar<TGrammarDict, TKind>
  private tokens: Token<TKind>[]
  private cursor: number
  //
  public trace: {
    tokens: string[][]
  }
  public AST: Node

  // #region CORE

  /** Check if there is still tokens to be consumed */
  public hasTokens(): boolean {
    return this.cursor < this.tokens.length
  }

  /** Return current token */
  public current(increment: number = 0): Token<TKind> {
    return this.tokens[this.cursor + increment]
  }

  /** Peek current token kind */
  public peek(increment: number = 0): TKind {
    if (this.cursor + increment >= this.tokens.length) return `end_of_file` as any
    return this.current(increment).kind
  }

  /** Peek tokenKind before current one */
  public before(): MaybeUndefined<TKind> {
    return this.current(-1)?.kind
  }

  /** Peek tokenKind before current one */
  public beforeToken(): Token<TKind> {
    const token = this.current(-1)
    assert(token, `No token before current one`)
    return token
  }

  /** Advance token */
  public next(expectedKinds: TKind[] | `any`, trace: MaybeArray<string>): Token<TKind> {
    // 1. Get current token to return
    const previous = this.tokens[this.cursor]

    // 2. Advance cursor
    this.trace.tokens[this.cursor] ??= []
    this.trace.tokens[this.cursor].push(...(isArray(trace) ? trace : [trace]))
    this.cursor++

    // 3. Check if token kind is as expected
    if (expectedKinds !== `any`) {
      assert(expectedKinds.length > 0, `Expected token kind array is empty`)
      assert(!previous || expectedKinds.includes(previous.kind), `Expected token kind ${expectedKinds.join(` or `)}, got ${previous?.kind}`)
    }

    return previous
  }

  /** Move cursor to index */
  public moveTo(characterIndex: number): Token<TKind> {
    // 1. Get current token to return
    const previous = this.tokens[this.cursor]

    // 2. Update cursor (by character index)
    let tokenIndex: Nullable<number> = null
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i]

      if (token.type === `lexical`) {
        const start = token.lexeme.start
        const end = start + token.lexeme.length - 1

        if (start > characterIndex) continue
        if (end < characterIndex) continue

        // untested
        if (start === characterIndex && end !== characterIndex) debugger
        if (start !== characterIndex && end === characterIndex) debugger

        if (start === characterIndex && end === characterIndex) {
          tokenIndex = i
          break
        }
      } else throw new Error(`Not implemented`)
    }

    assert(tokenIndex !== null, `Could not find token by character index`)

    this.cursor = tokenIndex

    return previous
  }

  // #endregion

  public process(grammar: SyntacticalGrammar<TGrammarDict, TKind>, tokens: Token<any>[], injections: InjectionData[], options: WithOptionalKeys<ParserOptions, `logger`>) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    }

    const injectedTokens = tokens.map((token, i) => {
      if (token.kind !== `injection_placeholder`) return token
      const index = Number(token.content.replace(/^\$/, ``))
      const injection = injections[index]

      assert(injection.result, `Injection placeholder was not computed`)

      return injections[index].result!.token
    })

    this.grammar = grammar
    this.tokens = injectedTokens
    this.cursor = 0

    global.__PARSER_TOKENS = tokens.map(token => token.content).join(` `)

    this.trace = { tokens: [] }
    this.AST = this.parse()

    return this.AST
  }

  protected parse(): Node {
    const statements: Statement[] = []
    while (this.hasTokens()) {
      const statement = this.grammar.parseStatement(this, DEFAULT_BINDING_POWERS.DEFAULT, this.options.syntacticalContext)
      statements.push(statement)
    }

    return statements[0]
  }

  public print() {
    const logger = _logger

    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`ABSTRACT SYNTAX TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    console.log(` `)

    this.AST.print()
  }
}
