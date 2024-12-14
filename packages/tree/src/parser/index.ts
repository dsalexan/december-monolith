/**
 * Here we have the PARSER, or Syntatic Analysis
 *
 * Effectively we parse tokens into an Abstract Syntax Tree (AST).
 * Each token is analysed following some rules (grammar rules?) to decide how it's node should be inserted into the existing tree
 */

import { MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { LexicalToken, Token } from "../token/core"
import { TokenKind, TokenKindName } from "../token/kind"
import { Lexeme } from "../token/lexeme"

import { SyntacticalGrammar } from "./grammar"
import { DEFAULT_BINDING_POWERS } from "./grammar/default"

import { Node, NodeType } from "../tree"
import { Statement, ExpressionStatement } from "../tree"
import { Expression } from "../tree"
import { BinaryExpression, CallExpression, MemberExpression } from "../tree"
import { Identifier, NumericLiteral, StringLiteral } from "../tree"
import { SyntacticalContext } from "./grammar/parserFunction"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { BindingPower, SyntacticalGrammar } from "./grammar"
export { SyntacticalContext, StatementParser, NUDParser, LEDParser } from "./grammar/parserFunction"

export interface ParserOptions {
  logger: typeof _logger
}

export default class Parser {
  public options: ParserOptions
  //
  public grammar: SyntacticalGrammar
  private tokens: Token[]
  private cursor: number
  //
  public AST: Node

  // #region CORE

  /** Check if there is still tokens to be consumed */
  public hasTokens(): boolean {
    return this.cursor < this.tokens.length
  }

  /** Return current token */
  public current(increment: number = 0): Token {
    return this.tokens[this.cursor + increment]
  }

  /** Peek current token kind */
  public peek(increment: number = 0): TokenKindName {
    if (this.cursor + increment >= this.tokens.length) return `end_of_file` as any
    return this.current(increment).kind.name
  }

  /** Advance token */
  public next(expectedKind?: TokenKindName): Token {
    const previous = this.tokens[this.cursor]
    this.cursor++

    // Check if token kind is as expected
    if (expectedKind) assert(!previous || previous.kind.name === expectedKind, `Expected token kind ${expectedKind}, got ${previous?.kind?.name}`)

    return previous
  }

  // #endregion

  public process(grammar: SyntacticalGrammar, tokens: Token[], context: SyntacticalContext, options: WithOptionalKeys<ParserOptions, `logger`>) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    }

    this.grammar = grammar
    this.tokens = tokens
    this.cursor = 0

    this.AST = this.parse(context)

    return this.AST
  }

  protected parse(context: SyntacticalContext): Node {
    const statements: Statement[] = []
    while (this.hasTokens()) {
      const statement = this.grammar.parseStatement(this, DEFAULT_BINDING_POWERS.DEFAULT, context)
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
