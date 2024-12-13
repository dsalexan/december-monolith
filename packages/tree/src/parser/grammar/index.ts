import { MaybeUndefined, Nullable } from "tsdef"

import { TokenKindName } from "../../token/kind"
import { Expression, Statement } from "../../tree"

import { BindingPower } from "./bindingPower"
import { LEDParser, NUDParser, StatementParser, EntryParser, SyntacticalDenotation, ParserFunction } from "./parserFunction"
import assert from "assert"
import { last, uniq } from "lodash"
import { ParseFunction } from "mathjs"

export type { BindingPower } from "./bindingPower"

export type SyntacticalLookupKey = SyntacticalDenotation

export class SyntacticalGrammar {
  public parseStatement: EntryParser<Statement>
  public parseExpression: EntryParser<Expression>

  protected bindingPowers: {
    statement: Partial<Record<TokenKindName, BindingPower[]>>
    nud: Partial<Record<TokenKindName, BindingPower[]>>
    led: Partial<Record<TokenKindName, BindingPower[]>>
  }

  protected parsers: {
    statement: Partial<Record<TokenKindName, StatementParser[]>>
    nud: Partial<Record<TokenKindName, NUDParser[]>>
    led: Partial<Record<TokenKindName, LEDParser[]>>
  }

  constructor(parseStatement: EntryParser<Statement>, parseExpression: EntryParser<Expression>) {
    this.parseStatement = parseStatement
    this.parseExpression = parseExpression

    this.bindingPowers = { statement: {}, nud: {}, led: {} }
    this.parsers = { statement: {}, nud: {}, led: {} }
  }

  /** Return binding power for tokenKind (can specify denonation) */
  public getBindingPower(kind: TokenKindName, denotation: SyntacticalDenotation): MaybeUndefined<BindingPower> {
    const StatementBindingPowers = this.bindingPowers.statement[kind]
    const NUDBindingPowers = this.bindingPowers.nud[kind]
    const LEDBindingPowers = this.bindingPowers.led[kind]

    const bindingPowers: BindingPower[] = []
    if (denotation === undefined || denotation === `statement`) bindingPowers.push(...(StatementBindingPowers ?? []))
    if (denotation === undefined || denotation === `nud`) bindingPowers.push(...(NUDBindingPowers ?? []))
    if (denotation === undefined || denotation === `led`) bindingPowers.push(...(LEDBindingPowers ?? []))

    const uniqueBindingPowers = uniq(bindingPowers)

    assert(uniqueBindingPowers.length <= 1, `Multiple binding powers for token kind "${kind}"${denotation ? ` and denotation "${denotation}"` : ``}`)

    // always returning last one registered (because originally the last value registered would have overriden the previous ones)
    return last(uniqueBindingPowers)
  }

  /** Return syntactical parser for specific denotation (stmt, nud, led) */
  public getParser<TParserFunction extends ParserFunction = StatementParser>(denotation: `statement`, kind: TokenKindName): MaybeUndefined<TParserFunction>
  public getParser<TParserFunction extends ParserFunction = NUDParser>(denotation: `nud`, kind: TokenKindName): MaybeUndefined<TParserFunction>
  public getParser<TParserFunction extends ParserFunction = LEDParser>(denotation: `led`, kind: TokenKindName): MaybeUndefined<TParserFunction>
  public getParser<TParserFunction extends ParserFunction>(denotation: SyntacticalDenotation, kind: TokenKindName): MaybeUndefined<TParserFunction> {
    let parserFunctions: ParserFunction[] = this.parsers[denotation][kind] ?? []

    assert(parserFunctions.length <= 1, `Multiple parsers for token kind "${kind}" and denotation "${denotation}"`)

    return parserFunctions[0] as TParserFunction
  }

  /** Register binding power for tokenKind and denotation */
  public addBindingPower(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower) {
    this.bindingPowers[denotation][kind] ??= []
    this.bindingPowers[denotation][kind]!.push(bindingPower)
  }

  /** Register a denonation parser for a token kind */
  public addParser<TParserFunction extends ParserFunction>(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower, parser: TParserFunction) {
    this.addBindingPower(denotation, kind, bindingPower)

    this.parsers[denotation][kind] ??= []
    const list = this.parsers[denotation][kind]! as ParserFunction[]
    list.push(parser)
  }

  /** Generic mass entry register */
  public add(...entries: SyntacticalGrammarEntry[]) {
    for (const entry of entries) {
      if (isParserFunctionEntry(entry)) this.addParser(entry.denotation, entry.kind, entry.bindingPower, entry.parser)
      else if (isBindingPowerEntry(entry)) this.addBindingPower(entry.denotation, entry.kind, entry.bindingPower)
      //
      else throw new Error(`Invalid syntactical grammar entry`)
    }
  }
}

export interface BindingPowerEntry {
  denotation: SyntacticalDenotation
  kind: TokenKindName
  bindingPower: BindingPower
}

export interface ParserFunctionEntry {
  denotation: SyntacticalDenotation
  kind: TokenKindName
  parser: ParserFunction
  //
  bindingPower: BindingPower
}

export type SyntacticalGrammarEntry = BindingPowerEntry | ParserFunctionEntry

export function isBindingPowerEntry(entry: SyntacticalGrammarEntry): entry is BindingPowerEntry {
  return `bindingPower` in entry && !(`parser` in entry)
}

export function isParserFunctionEntry(entry: SyntacticalGrammarEntry): entry is ParserFunctionEntry {
  return `parser` in entry
}
