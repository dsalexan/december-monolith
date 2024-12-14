import assert from "assert"
import { isNil, last, uniq } from "lodash"
import { MaybeUndefined, Nullable } from "tsdef"

import { Match } from "@december/utils"
import { IUnit, UnitManager } from "@december/utils/unit"

import { TokenKindName } from "../../token/kind"
import { Expression, NodeType, Statement } from "../../tree"

import { BindingPower } from "./bindingPower"
import { LEDParser, NUDParser, StatementParser, EntryParser, SyntacticalDenotation, ParserFunction, ParserFunctionIndex, ParserFunctionName, ParserFunctionImplementation } from "./parserFunction"
import { isBindingPowerEntry, isBindParserEntry, isRegisterParserEntry, isReTyperEntry, ReTyperEntry, SyntacticalGrammarEntry } from "./entries"

export type { BindingPower } from "./bindingPower"

export type SyntacticalLookupKey = SyntacticalDenotation
export { createReTyperEntry, createBindParserEntry, createRegisterParserEntry, createBindingPowerEntry } from "./entries"

export interface BaseParserFunctionIndex extends ParserFunctionIndex {
  parseStatement: EntryParser<Statement>
  parseExpression: EntryParser<Expression>
}

export class SyntacticalGrammar {
  protected bindingPowers: {
    statement: Partial<Record<TokenKindName, BindingPower[]>>
    nud: Partial<Record<TokenKindName, BindingPower[]>>
    led: Partial<Record<TokenKindName, BindingPower[]>>
  }

  protected functions: BaseParserFunctionIndex
  protected parsers: {
    statement: Partial<Record<TokenKindName, string[]>>
    nud: Partial<Record<TokenKindName, string[]>>
    led: Partial<Record<TokenKindName, string[]>>
  }

  protected reTypers: Map<string, ReTyperEntry> = new Map()
  protected unitManager: UnitManager

  constructor(unitManager: UnitManager) {
    this.bindingPowers = { statement: {}, nud: {}, led: {} }
    this.functions = {} as any
    this.parsers = { statement: {}, nud: {}, led: {} }
    this.reTypers = new Map()
    this.unitManager = unitManager
  }

  public get parseStatement(): EntryParser<Statement> {
    assert(this.functions[`parseStatement`], `parseStatement was nor registered`)
    return this.functions[`parseStatement`]
  }

  public get parseExpression(): EntryParser<Expression> {
    assert(this.functions[`parseExpression`], `parseExpression was nor registered`)
    return this.functions[`parseExpression`]
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
  public getParser(denotation: `statement`, kind: TokenKindName): MaybeUndefined<StatementParser>
  public getParser(denotation: `nud`, kind: TokenKindName): MaybeUndefined<NUDParser>
  public getParser(denotation: `led`, kind: TokenKindName): MaybeUndefined<LEDParser>
  public getParser(denotation: SyntacticalDenotation, kind: TokenKindName): MaybeUndefined<Function> {
    let functionNames: string[] = uniq(this.parsers[denotation][kind] ?? [])

    assert(functionNames.length <= 1, `Multiple parsers for token kind "${kind}" and denotation "${denotation}"`)

    const fns = functionNames.map(name => this.functions[name])
    assert(fns.length === 0 || fns.some(fn => !isNil(fn)), `Some function is not indexed in centralized index`)
    return fns[0]
  }

  /** Returns syntactical parser function by name */
  public call<TParserFunctionIndex extends ParserFunctionIndex, TParserName extends ParserFunctionName<TParserFunctionIndex>>(parserName: TParserName): ParserFunctionImplementation<TParserFunctionIndex, TParserName> {
    assert(parserName !== `parseExpression` && parserName !== `parseStatement`, `Use parseExpression or parseStatement directly`)

    const fn = this.functions[parserName as string]
    assert(fn, `Parser "${String(parserName)}" doesn't exist`)

    return fn as ParserFunctionImplementation<TParserFunctionIndex, TParserName>
  }

  /** Return if string should be re-typed as another thing */
  public shouldReType(variableName: string): MaybeUndefined<{ match: Match.BasePatternMatch; type: NodeType }> {
    for (const [key, { pattern, type }] of this.reTypers) {
      const match = pattern.match(variableName)
      if (match.isMatch) return { match, type }
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

  /** Register a parser function in centralized index */
  public registerParser<TParserFunctionIndex extends ParserFunctionIndex>(name: ParserFunctionName<TParserFunctionIndex>, fn: ParserFunctionImplementation<TParserFunctionIndex>, forceRegistration: boolean = false) {
    if (!forceRegistration) assert(!this.functions[name as string], `Parser function "${String(name)}" already exists`)

    this.functions[name as string] = fn as Function
  }

  /** Bind a denonation parser for a token kind */
  public bindParser<TParserFunctionIndex extends ParserFunctionIndex>(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower, parser: ParserFunctionName<TParserFunctionIndex>) {
    this.addBindingPower(denotation, kind, bindingPower)

    assert(this.functions[parser as string], `Parser function "${String(parser)}" doesn't exists`)

    this.parsers[denotation][kind] ??= []

    const list = this.parsers[denotation][kind]!
    list.push(parser as string)
  }

  /** Register identifier by variable name */
  public addReTyper(key: string, type: NodeType, pattern: Match.Pattern) {
    assert(!this.reTypers.has(key), `ReTyper entry "${key}" already registered`)

    this.reTypers.set(key, { key, pattern, type })
  }

  /** Generic mass entry register */
  public add<TParserFunctionIndex extends ParserFunctionIndex>(...entries: SyntacticalGrammarEntry<TParserFunctionIndex>[]) {
    for (const entry of entries) {
      if (isRegisterParserEntry(entry)) this.registerParser(entry.name, entry.fn, entry.forceRegistration)
      else if (isBindParserEntry(entry)) this.bindParser(entry.denotation, entry.kind, entry.bindingPower, entry.parser)
      else if (isBindingPowerEntry(entry)) this.addBindingPower(entry.denotation, entry.kind, entry.bindingPower)
      else if (isReTyperEntry(entry)) this.addReTyper(entry.key, entry.type, entry.pattern)
      //
      else throw new Error(`Invalid syntactical grammar entry`)
    }
  }
}
