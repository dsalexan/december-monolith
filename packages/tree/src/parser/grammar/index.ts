import { getName } from "./../../../src2/nrs_OLD/rule_old/index"
import { parseExpression } from "./default/parsers/expression"
import assert from "assert"
import { isFunction, isNil, isString, last, uniq } from "lodash"
import { AnyObject, MaybeNull, MaybeUndefined, Nullable } from "tsdef"

import { Match } from "@december/utils"
import { IUnit, UnitManager } from "@december/utils/unit"

import { TokenKindName } from "../../token/kind"
import { Expression, Identifier, Node, NodeType, Statement, StringLiteral } from "../../tree"

import { BindingPower } from "./bindingPower"
import { LEDParser, NUDParser, StatementParser, EntryParser, SyntacticalDenotation } from "./parserFunction"
import { isBindingPowerEntry, isBindParserEntry, isRegisterParserEntry, isTransformNodeEntry, createTransformNodeEntry, SyntacticalGrammarEntry, TransformNodeEntry } from "./entries"
import { FunctionProvider, GetFunction, GetKey } from "./../../utils"
import { Token } from "../../token/core"

export type { BindingPower } from "./bindingPower"

export type SyntacticalLookupKey = SyntacticalDenotation
export { createTransformNodeEntry, createBindParserEntry, createRegisterParserEntry, createBindingPowerEntry, isTransformNodeEntry } from "./entries"
export { DEFAULT_GRAMMAR } from "./default"

export type BaseParserProvider = Record<string, (...args: any[]) => Node>

export class SyntacticalGrammar<TDict extends BaseParserProvider> extends FunctionProvider<TDict> {
  protected bindingPowers: {
    statement: Partial<Record<TokenKindName, BindingPower[]>>
    nud: Partial<Record<TokenKindName, BindingPower[]>>
    led: Partial<Record<TokenKindName, BindingPower[]>>
  }

  protected parsers: {
    statement: Partial<Record<TokenKindName, string[]>>
    nud: Partial<Record<TokenKindName, string[]>>
    led: Partial<Record<TokenKindName, string[]>>
  }

  protected transformType: Record<NodeType, Map<string, TransformNodeEntry>> = {} as any // from -> name -> entry
  protected unitManager: UnitManager

  constructor(unitManager: UnitManager) {
    super()

    this.bindingPowers = { statement: {}, nud: {}, led: {} }
    this.parsers = { statement: {}, nud: {}, led: {} }
    this.transformType = {} as any
    this.unitManager = unitManager
  }

  public get parseStatement(): EntryParser<Statement> {
    return this.getFunction(`parseStatement`)
  }

  public get parseExpression(): EntryParser<Expression> {
    return this.getFunction(`parseExpression`)
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
  public getParser(denotation: `statement`, kind: TokenKindName, before: MaybeUndefined<TokenKindName>): MaybeUndefined<StatementParser>
  public getParser(denotation: `nud`, kind: TokenKindName, before: MaybeUndefined<TokenKindName>): MaybeUndefined<NUDParser>
  public getParser(denotation: `led`, kind: TokenKindName, before: MaybeUndefined<TokenKindName>): MaybeUndefined<LEDParser>
  public getParser(denotation: SyntacticalDenotation, kind: TokenKindName, before: MaybeUndefined<TokenKindName>): MaybeUndefined<Function> {
    let functionNames: string[] = uniq(this.parsers[denotation][kind] ?? [])

    assert(functionNames.length <= 1, `Multiple parsers for token kind "${kind}" and denotation "${denotation}"`)

    const fns = functionNames.map(name => this.getFunction(name))
    assert(fns.length === 0 || fns.some(fn => !isNil(fn)), `Some function is not indexed in centralized index`)
    return fns[0]
  }

  /** Returns syntactical parser function by name */
  public override call<TKey extends GetKey<TDict> = GetKey<TDict>>(name: TKey): GetFunction<TDict, TKey> {
    assert(name !== `parseExpression` && name !== `parseStatement`, `Use parseExpression or parseStatement directly`)

    return super.call(name)
  }

  /** Return if string should be re-typed as another thing */
  public shouldTransformNode(node: Node): MaybeNull<Node> {
    const transformType = this.transformType[node.type]
    if (!transformType) return null

    const content = node.getContent()
    for (const [key, { pattern, to }] of transformType) {
      const match = pattern.match(content)
      if (match.isMatch) {
        if (isFunction(to)) return to(node)
        else if (Node.isNode(to)) to
        else if (isString(to)) {
          let newNode: Node
          let tokens: Token[] = []

          // 1. Get relevant info from original node
          if (node instanceof StringLiteral) tokens = [...node.tokens]
          //
          else throw new Error(`Invalid target node to transform "${node.type}"`)

          // 2. Create new node
          if (to === `Identifier`) newNode = new Identifier(...tokens)
          //
          else throw new Error(`Invalid transform final type "${to}"`)

          // 3. Return new node
          return newNode
        }
      }
    }

    return null
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
  public registerParser(name: GetKey<TDict>, fn: GetFunction<TDict>, override: boolean = false) {
    this.addFunction(name, fn, override)
  }

  /** Bind a denonation parser for a token kind */
  public bindParser(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower, parser: GetKey<TDict>) {
    this.addBindingPower(denotation, kind, bindingPower)

    assert(this.getFunction(parser), `Parser function "${String(parser)}" doesn't exists`)

    this.parsers[denotation][kind] ??= []

    const list = this.parsers[denotation][kind]!

    assert(isString(parser), `Parser name must be a string`)
    list.push(parser)
  }

  /** Register identifier by variable name */
  public addTransformType(key: string, from: NodeType, pattern: Match.Pattern, to: TransformNodeEntry[`to`]) {
    assert(!this.transformType[from]?.has(key), `TransformType entry "${key}" already registered`)

    this.transformType[from] ??= new Map()
    this.transformType[from].set(key, { key, from, pattern, to })
  }

  /** Generic mass entry register */
  public add<TDict>(...entries: SyntacticalGrammarEntry<TDict>[]) {
    for (const entry of entries) {
      if (isRegisterParserEntry(entry)) this.registerParser(entry.name, entry.fn, entry.override)
      else if (isBindParserEntry(entry)) this.bindParser(entry.denotation, entry.kind, entry.bindingPower, entry.parser)
      else if (isBindingPowerEntry(entry)) this.addBindingPower(entry.denotation, entry.kind, entry.bindingPower)
      else if (isTransformNodeEntry(entry)) this.addTransformType(entry.key, entry.from, entry.pattern, entry.to)
      //
      else throw new Error(`Invalid syntactical grammar entry`)
    }
  }
}
