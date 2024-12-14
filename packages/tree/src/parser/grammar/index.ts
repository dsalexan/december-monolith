import assert from "assert"
import { last, uniq } from "lodash"
import { MaybeUndefined, Nullable } from "tsdef"

import { Match } from "@december/utils"
import { IUnit, UnitManager } from "@december/utils/unit"

import { TokenKindName } from "../../token/kind"
import { Expression, Statement } from "../../tree"

import { BindingPower } from "./bindingPower"
import { LEDParser, NUDParser, StatementParser, EntryParser, SyntacticalDenotation, ParserFunction } from "./parserFunction"

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

  protected identifiers: Map<string, { pattern: Match.Pattern }> = new Map()
  protected unitManager: UnitManager

  constructor(parseStatement: EntryParser<Statement>, parseExpression: EntryParser<Expression>, unitManager: UnitManager) {
    this.parseStatement = parseStatement
    this.parseExpression = parseExpression

    this.bindingPowers = { statement: {}, nud: {}, led: {} }
    this.parsers = { statement: {}, nud: {}, led: {} }
    this.identifiers = new Map()
    this.unitManager = unitManager
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

  /** Return if string is an identifier */
  public isIdentifier(variableName: string): MaybeUndefined<Match.BasePatternMatch> {
    for (const [key, { pattern }] of this.identifiers) {
      const match = pattern.match(variableName)
      if (match.isMatch) return match
    }

    return undefined
  }

  /** Return unit definition by symbol */
  public getUnit(unitName: string): Nullable<IUnit> {
    return this.unitManager.getUnit(`symbol`, unitName)
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

  /** Register identifier by variable name */
  public addIdentifier(key: string, pattern: Match.Pattern) {
    assert(!this.identifiers.has(key), `Identifier entry "${key}" already registered`)

    this.identifiers.set(key, { pattern })
  }

  /** Generic mass entry register */
  public add(...entries: SyntacticalGrammarEntry[]) {
    for (const entry of entries) {
      if (isParserFunctionEntry(entry)) this.addParser(entry.denotation, entry.kind, entry.bindingPower, entry.parser)
      else if (isBindingPowerEntry(entry)) this.addBindingPower(entry.denotation, entry.kind, entry.bindingPower)
      else if (isIdentifierEntry(entry)) this.addIdentifier(entry.key, entry.pattern)
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

export interface IdentifierEntry {
  key: string
  pattern: Match.Pattern
}

export type SyntacticalGrammarEntry = BindingPowerEntry | ParserFunctionEntry | IdentifierEntry

export function isBindingPowerEntry(entry: SyntacticalGrammarEntry): entry is BindingPowerEntry {
  return `bindingPower` in entry && !(`parser` in entry)
}

export function isParserFunctionEntry(entry: SyntacticalGrammarEntry): entry is ParserFunctionEntry {
  return `parser` in entry
}

export function isIdentifierEntry(entry: SyntacticalGrammarEntry): entry is IdentifierEntry {
  return `pattern` in entry
}

export const createBindingPowerEntry = (denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower): BindingPowerEntry => ({ denotation, kind, bindingPower })

export const createIdentifierEntry = (key: string, pattern: Match.Pattern): IdentifierEntry => ({ key, pattern })

export function createParserFunctionEntry(denotation: `statement`, kind: TokenKindName, bindingPower: BindingPower, parser: StatementParser): ParserFunctionEntry
export function createParserFunctionEntry(denotation: `nud`, kind: TokenKindName, bindingPower: BindingPower, parser: NUDParser): ParserFunctionEntry
export function createParserFunctionEntry(denotation: `led`, kind: TokenKindName, bindingPower: BindingPower, parser: LEDParser): ParserFunctionEntry
export function createParserFunctionEntry(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower, parser: ParserFunction): ParserFunctionEntry {
  return { denotation, kind, bindingPower, parser }
}
