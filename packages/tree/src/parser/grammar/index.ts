import assert from "assert"
import { MaybeUndefined } from "tsdef"

import { insertionSort, sortedInsert } from "@december/utils/sort"

import type Parser from ".."
import { TokenKindName } from "../../token/kind"
import { Expression, Statement } from "../../tree"
import type { SyntacticalContext } from ".."
import { last } from "lodash"
import { DEFAULT_BINDING_POWERS } from "./default"

export { DEFAULT_GRAMMAR, DEFAULT_BINDING_POWERS, DEFAULT_PARSERS, DEFAULT_PARSE_EXPRESSION, DEFAULT_PARSE_STATEMENT } from "./default"

export type BindingPower = number

export type EntryParser = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext) => Expression
export type StatementParser = (p: Parser, context: SyntacticalContext) => Statement
export type NUDParser = (p: Parser, context: SyntacticalContext) => Expression
export type LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext) => Expression

export type SyntacticalParser = StatementParser | NUDParser | LEDParser
export type SyntacticalParserType = `statement` | `nud` | `led`

export interface BoundParser<TParser extends SyntacticalParser = SyntacticalParser> {
  type: SyntacticalParserType
  bindingPower: BindingPower
  parser: TParser
}
export type TokenKindLookup<TValue> = Partial<Record<TokenKindName, TValue>>

export class SyntacticalGrammar {
  public bindingPower: TokenKindLookup<BindingPower[]>
  public handlers: {
    parseStatement: EntryParser
    parseExpression: EntryParser
    statement: TokenKindLookup<BoundParser<StatementParser>[]>
    nud: TokenKindLookup<BoundParser<NUDParser>[]>
    led: TokenKindLookup<BoundParser<LEDParser>[]>
  }

  public reset(parseStatement: EntryParser, parseExpression: EntryParser): void {
    this.bindingPower = {
      // TODO: Move this elsewhere, probably  to default
      comma: [DEFAULT_BINDING_POWERS.COMMA],
      close_parenthesis: [DEFAULT_BINDING_POWERS.COMMA],
      close_braces: [DEFAULT_BINDING_POWERS.COMMA],
      close_brackets: [DEFAULT_BINDING_POWERS.COMMA],
    }
    this.handlers = {
      parseStatement,
      parseExpression,
      statement: {},
      nud: {},
      led: {},
    }
  }

  constructor(parseStatement: EntryParser, parseExpression: EntryParser) {
    this.reset(parseStatement, parseExpression)
  }

  public add(...parsers: (BoundParser & { tokenKind: TokenKindName })[]): void {
    for (const parser of parsers) this.addBoundParser(parser.tokenKind, parser)
  }

  /** Add handler and binding power to tables */
  public addBoundParser(tokenKind: TokenKindName, { type, bindingPower, parser }: BoundParser): void {
    this.bindingPower[tokenKind] ??= []
    if (!this.bindingPower[tokenKind]!.includes(bindingPower)) sortedInsert(this.bindingPower[tokenKind]!, bindingPower)

    this.handlers[type][tokenKind] ??= []
    sortedInsert(this.handlers[type][tokenKind]!, { type, bindingPower, parser }, handler => handler.bindingPower)
  }

  /** Return binding handler (mostly internal) */
  private getBoundParser<TParser extends SyntacticalParser = SyntacticalParser>(type: SyntacticalParserType, tokenKind: TokenKindName): MaybeUndefined<BoundParser<TParser>> {
    const lookup = this.handlers[type] as TokenKindLookup<BoundParser<TParser>[]>
    const handlers = lookup[tokenKind] ?? []
    assert(handlers.length <= 1, `Multiple handlers for the same token kind "${tokenKind}"`)

    const [handler] = handlers

    return handler
  }

  /** Return handler function for token kind */
  public getParser<TParser = StatementParser>(type: `statement`, tokenKind: TokenKindName): MaybeUndefined<TParser>
  public getParser<TParser = NUDParser>(type: `nud`, tokenKind: TokenKindName): MaybeUndefined<TParser>
  public getParser<TParser = LEDParser>(type: `led`, tokenKind: TokenKindName): MaybeUndefined<TParser>
  public getParser<TParser extends SyntacticalParser = SyntacticalParser>(type: SyntacticalParserType, tokenKind: TokenKindName): MaybeUndefined<TParser> {
    const entry = this.getBoundParser(type, tokenKind)

    return entry?.parser as TParser
  }

  /** Return binding power for token kind */
  public getBindingPower(tokenKind: TokenKindName): MaybeUndefined<BindingPower> {
    const bindingPowers = this.bindingPower[tokenKind] ?? []
    assert(bindingPowers.length > 0, `No binding power for token kind "${tokenKind}"`)
    // assert(bindingPowers.length <= 1, `Multiple binding powers for the same token kind "${tokenKind}"`)

    return last(bindingPowers)!
  }

  public parseStatement(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Statement {
    return this.handlers.parseStatement(p, minimumBindingPower, context)
  }

  public parseExpression(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
    return this.handlers.parseExpression(p, minimumBindingPower, context)
  }
}
