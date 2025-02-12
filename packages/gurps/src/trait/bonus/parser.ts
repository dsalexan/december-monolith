import assert from "assert"
import { MaybeUndefined } from "tsdef"
import { cloneDeep } from "lodash"

import { Parser } from "@december/tree"
import { BindingPower, createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "@december/tree/parser"
import { Expression, ExpressionList, Node, NodeCloneOptions } from "@december/tree/tree"
import { EntryParser, LEDParser, SyntacticalContext } from "@december/tree/parser/grammar/parserFunction"
import { TokenKind } from "@december/tree/token"

import { DEFAULT_BINDING_POWERS, DEFAULT_PARSERS } from "@december/tree/parser/grammar/default"
import { createBindParserEntry } from "@december/tree/parser/grammar"

import { IGURPSBonus, RuntimeIGURPSBonus } from "./bonus"
import { GCABonusModularTokenKind } from "./lexer"

// #region  NODES

export class GCABonusExceptionsExpression extends Expression {
  type = `GCABonusExceptionsExpression` as any

  public get unless() {
    return this.childrenByLabel[`unless`] as MaybeUndefined<Expression>
  }

  public get onlyIf() {
    return this.childrenByLabel[`onlyIf`] as MaybeUndefined<Expression>
  }

  constructor({ unless, onlyIf }: { unless?: Expression; onlyIf?: Expression }) {
    super()

    if (unless) this.addChild(unless, this.children.length, `unless`)
    if (onlyIf) this.addChild(onlyIf, this.children.length, `onlyIf`)
  }

  public override constructClone(options?: NodeCloneOptions): this {
    return new GCABonusExceptionsExpression({
      unless: this.unless ? this.unless.clone(options) : undefined,
      onlyIf: this.onlyIf ? this.onlyIf.clone(options) : undefined,
    }) as this
  }

  public override getContent(options = {}) {
    // const localExceptionText = ` ${unless} Target${tagName}${operator}${value}`
    let exceptionText: string[] = []

    const exceptions: (Expression | undefined)[] = [this.unless, this.onlyIf]
    for (const [i, exception] of exceptions.entries()) {
      if (exception === undefined) continue

      const unless = i === 0 ? `Unless` : `OnlyIf`

      const _exception = exception.getContent(options)
      exceptionText.push(`${unless} ${_exception}`)
    }

    return exceptionText.join(` `)
  }

  public override getDebug(): string {
    return this.toString()
  }

  public static isGCABonusExceptionsExpression(value: Node): value is GCABonusExceptionsExpression {
    return (value as any).type === `GCABonusExceptionsExpression`
  }
}

export class GCABonusInformationExpression extends Expression {
  type = `GCABonusInformationExpression` as any

  public get description() {
    return this.childrenByLabel[`description`] as MaybeUndefined<Expression>
  }

  public get reason() {
    return this.childrenByLabel[`reason`] as MaybeUndefined<Expression>
  }

  constructor({ description, reason }: { description?: Expression; reason?: Expression }) {
    super()

    if (description) this.addChild(description, this.children.length, `description`)
    if (reason) this.addChild(reason, this.children.length, `reason`)
  }

  public override constructClone(options?: NodeCloneOptions): this {
    return new GCABonusInformationExpression({
      description: this.description ? this.description.clone(options) : undefined,
      reason: this.reason ? this.reason.clone(options) : undefined,
    }) as this
  }

  public override getContent(options = {}) {
    // reason = ` When "${circumstance}"`
    const reason: string = this.reason ? ` When "${this.reason.getContent(options)}"` : ``

    // listAs = ` ListAs "${bonusText}"`
    const listAs: string = this.description ? ` ListAs "${this.description.getContent(options)}"` : ``

    return `${reason}${listAs}`
  }

  public override getDebug(): string {
    return this.toString()
  }

  public static isGCABonusInformationExpression(value: Node): value is GCABonusInformationExpression {
    return (value as any).type === `GCABonusInformationExpression`
  }
}

export class GCABonusExpression extends Expression {
  type = `GCABonusExpression` as any

  public singleBonus: boolean

  public get value() {
    return this.childrenByLabel[`value`] as Expression
  }

  public get maximum() {
    return this.childrenByLabel[`maximum`] as MaybeUndefined<Expression>
  }

  public get source() {
    return this.childrenByLabel[`source`] as MaybeUndefined<Expression>
  }

  //

  public get target() {
    return this.childrenByLabel[`target`] as Expression
  }

  public get byMode() {
    return this.childrenByLabel[`byMode`] as MaybeUndefined<Expression>
  }

  //

  public get exceptions() {
    return this.childrenByLabel[`exceptions`] as MaybeUndefined<GCABonusExceptionsExpression>
  }

  public get information() {
    return this.childrenByLabel[`information`] as MaybeUndefined<GCABonusInformationExpression>
  }

  constructor(singleBonus: boolean, value: Expression, target: Expression) {
    super()

    this.singleBonus = singleBonus
    this.addChild(value, 0, `value`)
    this.addChild(target, 1, `target`)
  }

  public override constructClone(options?: NodeCloneOptions): this {
    const clone = new GCABonusExpression(this.singleBonus, this.value.clone(options), this.target.clone(options)) as this

    if (this.maximum) clone.setChild(this.maximum.clone(options), `maximum`)
    if (this.source) clone.setChild(this.source.clone(options), `source`)

    if (this.byMode) clone.setChild(this.byMode.clone(options), `byMode`)

    if (this.exceptions) clone.setChild(this.exceptions.clone(options), `exceptions`)
    if (this.information) clone.setChild(this.information.clone(options), `information`)

    return clone
  }

  public override getContent(options = {}) {
    // 1. Parse value separately
    const singleBonus = this.singleBonus ? `= ` : ``
    const bonus = this.value.toString()

    let source: string = ``
    if (this.source) {
      const _source = this.source.getContent(options)
      if (_source.toLocaleLowerCase() === `me`) source = ``
      else source = ` From ${_source}`
    }

    const maximum = this.maximum ? ` UpTo ${this.maximum.getContent(options)}` : ``

    // 2. Parse target separately
    const _target = this.target.getContent(options)
    const target = ExpressionList.isExpressionList(this.target) && this.target.expressions.length > 1 ? `(${_target})` : _target

    const byMode = this.byMode ? ` ByMode ${this.byMode.getContent(options)}` : ``

    // 3. Parse other expressions
    const expressions: string[] = [`${singleBonus}${bonus} To ${target}${byMode}${source}${maximum}`]

    if (this.exceptions) expressions.push(this.exceptions.getContent(options))
    if (this.information) expressions.push(this.information.getContent(options))

    return expressions.join(` `)
  }

  public override getDebug(): string {
    return this.toString()
  }

  public static isGCABonusExpression(value: Node): value is GCABonusExpression {
    return (value as any).type === `GCABonusExpression`
  }
}

// #endregion

// #region  SYNTACTICAL GRAMMAR

// #region    ENTRIES

const GCA_BONUS_BINDING_POWER = DEFAULT_BINDING_POWERS.STRUCTURAL + 0

// const SINGLE_BONUS = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>('nud', 'singleBonus', DEFAULT_BINDING_POWERS.PRIMARY, 'parse')
const TO = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `to`, GCA_BONUS_BINDING_POWER + 10, `parseGCABonusTargetExpression`)
const BY_MODE = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `byMode`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)
const FROM = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `from`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)
const UP_TO = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `upTo`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)
const UNLESS = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `unless`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)
const ONLY_IF = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `onlyIf`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)
const WHEN = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `when`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)
const LIST_AS = createBindParserEntry<GCABonusParserProvider, GCABonusModularTokenKind>(`led`, `listAs`, GCA_BONUS_BINDING_POWER + 1, `parseGCABonusArgumentExpression`)

// #endregion

// #region    PARSERS

export const parseGCABonusTargetExpression: LEDParser = (p: Parser<GCABonusParserProvider, GCABonusModularTokenKind>, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): GCABonusExpression => {
  const operator = p.next([`to`], `parseGCABonusTargetExpression`)
  const bindingPower = p.grammar.getBindingPower(operator.kind, `led`)!
  const right = p.grammar.parseExpression(p, bindingPower, context)

  const bonus = new GCABonusExpression(false, left, right)

  return bonus
}

export const parseGCABonusArgumentExpression: LEDParser = (p: Parser<GCABonusParserProvider, GCABonusModularTokenKind>, gcaBonus: GCABonusExpression, minimumBindingPower: BindingPower, context: SyntacticalContext): GCABonusExpression => {
  assert(GCABonusExpression.isGCABonusExpression(gcaBonus), `Invalid GCABonusExpression`)

  const ALLOWED_LABELS: GCABonusModularTokenKind[] = [`byMode`, `from`, `upTo`, `unless`, `onlyIf`, `when`, `listAs`]
  const token = p.next(ALLOWED_LABELS, `parseGCABonusArgumentExpression`).kind

  const bindingPower = p.grammar.getBindingPower(token, `led`)!
  const expression = p.grammar.parseExpression(p, bindingPower, context)

  if (token === `byMode`) gcaBonus.setChild(expression, `byMode`)
  else if (token === `from`) gcaBonus.value.setChild(expression, `source`)
  else if (token === `upTo`) gcaBonus.value.setChild(expression, `maximum`)
  else if (token === `unless` || token === `onlyIf`) {
    if (!gcaBonus.exceptions) gcaBonus.setChild(new GCABonusExceptionsExpression({}), `exceptions`)
    assert(gcaBonus.exceptions, `Exceptions not defined`)

    if (token === `unless`) gcaBonus.exceptions.setChild(expression, `unless`)
    else if (token === `onlyIf`) gcaBonus.exceptions.setChild(expression, `onlyIf`)
  } //
  else if (token === `when` || token === `listAs`) {
    if (!gcaBonus.information) gcaBonus.setChild(new GCABonusInformationExpression({}), `information`)
    assert(gcaBonus.information, `Information not defined`)

    if (token === `when`) gcaBonus.information.setChild(expression, `reason`)
    else if (token === `listAs`) gcaBonus.information.setChild(expression, `description`)
  }
  //
  else throw new Error(`Not implemented token ${token}`)

  // console.log(gcaBonus.getContent())

  return gcaBonus
}

// override @ parseExpression
export const parseExpression: EntryParser<Expression> = (p: Parser<any, GCABonusModularTokenKind | TokenKind>, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  if (context.mode === `GCABonus`) {
    const singleBonus = p.current().kind === `equals`
    if (singleBonus) p.next([`equals`], `GCABonus::parseExpression`)

    const toBindingPower = p.grammar.getBindingPower(`to`, `led`)!

    /**
     * Parse expression UNTIL we reach a COMMA
     *
     * - But COMMA is 10³, while ASSIGNMENT (GCA_BONUS) is 10⁴
     * - Binding power for GCA_BONUS is mostly irrelevant, the only thing we care is to stop when a COMMA is reached at "top level"
     *
     * I see two options:
     *
     * A) We update comma binding power ONLY for this top level, not changing for deeper parsings
     * B) We somehow consider COMMA as prioritary exit when found
     *
     * A sounds appropriate for a Pratt Parser, so we start there.
     */

    const newContext: SyntacticalContext = { ...context, mode: `expression` }
    const expression = p.grammar.parseExpression(p, minimumBindingPower, newContext)

    assert(GCABonusExpression.isGCABonusExpression(expression), `Invalid GCABonusExpression`)

    if (singleBonus) expression.singleBonus = true

    return expression
  }

  return DEFAULT_PARSERS.parseExpression(p, minimumBindingPower, context)
}

// #endregion

export const GCA_BONUS_MODULAR_PARSER_PROVIDER = {
  parseExpression,
  //
  parseGCABonusTargetExpression,
  parseGCABonusArgumentExpression,
}
export type GCABonusParserProvider = typeof GCA_BONUS_MODULAR_PARSER_PROVIDER

export const GCA_BONUS_MODULAR_SYNTACTICAL_GRAMMAR: SyntacticalGrammarEntry<GCABonusParserProvider, GCABonusModularTokenKind>[] = [
  ...createRegisterParserEntriesFromIndex<GCABonusParserProvider>(GCA_BONUS_MODULAR_PARSER_PROVIDER, true), //
  //
  TO,
  BY_MODE,
  FROM,
  UP_TO,
  UNLESS,
  ONLY_IF,
  WHEN,
  LIST_AS,
]

// #endregion
