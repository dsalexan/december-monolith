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

import { DEFAULT_BINDING_POWERS, SyntacticalGrammar } from "./grammar"

import { Node, NodeType } from "../tree"
import { Statement, ExpressionStatement } from "../tree"
import { Expression } from "../tree"
import { BinaryExpression, CallExpression, MemberExpression } from "../tree"
import { Identifier, NumericLiteral, StringLiteral, Property } from "../tree"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export type SyntaxMode = `math-enabled` | `text-processing`

export interface SyntacticalContext {
  mode: SyntaxMode
}

const SKIPPABLE_TOKENS: Record<SyntaxMode, MaybeUndefined<TokenKindName[]>> = {
  [`math-enabled`]: [`whitespace`],
  [`text-processing`]: undefined,
}

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

  public token(context: SyntacticalContext) {
    const skippableTokens = SKIPPABLE_TOKENS[context.mode]

    return {
      nonSkippableCursor: () => {
        if (!skippableTokens || skippableTokens.length === 0) return this.cursor

        let cursor = this.cursor
        while (this.cursor < this.tokens.length && skippableTokens.includes(this.tokens[cursor].kind.name)) cursor++

        return cursor
      },
      has: () => {
        const cursor = this.token(context).nonSkippableCursor()
        return cursor < this.tokens.length
      },
      peek: () => {
        const cursor = this.token(context).nonSkippableCursor()
        return this.tokens[cursor].kind.name
      },
      next: (expectedKind?: TokenKindName): Token => {
        const previous = this.tokens[this.cursor]

        // advance cursor (skipping skippable tokens)
        if (skippableTokens && skippableTokens.length > 0) while (this.cursor + 1 < this.tokens.length && skippableTokens.includes(this.tokens[this.cursor + 1].kind.name)) this.cursor++
        this.cursor++

        // Check if token kind is as expected
        if (expectedKind) assert(!previous || previous.kind.name === expectedKind, `Expected token kind ${expectedKind}, got ${previous?.kind?.name}`)

        return previous
      },
    }
  }

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
    while (this.token(context).has()) {
      const statement = this.grammar.parseStatement(this, DEFAULT_BINDING_POWERS.DEFAULT, context)
      debugger
      statements.push(statement)
    }

    debugger
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
