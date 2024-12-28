import { MaybeUndefined } from "tsdef"
import assert from "assert"

import { IUnit } from "@december/utils/unit"

import { NODE_TYPE_COLOR, NodeType } from "../type"
import { Expression } from "./expression"

import { Block, paint } from "../../logger"
import { Token } from "../../token/core"
import { SyntacticalContext } from "../../parser"
import { cloneDeep } from "lodash"

export class Literal<TValue> extends Expression {
  public getValue(): TValue {
    throw new Error(`Unimplemented`)
  }

  public override getDebug(): string {
    return String(this.getValue())
  }
}

export class BooleanLiteral extends Literal<Boolean> {
  type: NodeType = `BooleanLiteral`
  public value: boolean

  constructor(value: boolean) {
    super()
    this.value = value
  }

  public override constructClone(options): this {
    return new BooleanLiteral(this.value) as this
  }

  public override getValue(): boolean {
    return this.value
  }
}

export class NumericLiteral extends Literal<number> {
  type: NodeType = `NumericLiteral`

  public get value(): Token {
    return this.tokens[0]
  }

  constructor(value: Token) {
    super()
    this.tokens = [value]
  }

  public override constructClone(options): this {
    return new NumericLiteral(this.value.clone(options)) as this
  }

  public getValue(): number {
    const numericValue = parseFloat(this.getContent())
    assert(!isNaN(numericValue), `Invalid numeric value: ${this.getContent()}`)

    return numericValue
  }

  public override toBlocks(): Block[] {
    const color = NODE_TYPE_COLOR[this.type] ?? paint.red
    return [color(this.value.toString())]
  }
}

export class StringLiteral extends Literal<string> {
  type: NodeType = `StringLiteral`
  public quoted: boolean = false

  constructor(...tokens: Token[]) {
    super()
    this.tokens = [...tokens]
  }

  public override constructClone(options): this {
    return new StringLiteral(...this.tokens.map(token => token.clone(options))) as this
  }

  public override getWrappers(): [string, string] {
    return [`"`, `"`]
  }

  public override forceWrap(): boolean {
    return this.quoted
  }

  public getValue(): string {
    return this.getContent()
  }
}

export class Identifier extends StringLiteral {
  type: NodeType = `Identifier`

  constructor(...variableNameTokens: Token[]) {
    super(...variableNameTokens)
  }

  public override constructClone(options): this {
    return new Identifier(...this.tokens.map(token => token.clone(options))) as this
  }

  public get variableNameTokens(): Token[] {
    return this.tokens
  }

  public getVariableName(): string {
    return this.getContent()
  }

  public override getValue(): string {
    throw new Error(`Don't use this method for identifiers. Use getVariableName() instead.`)
  }

  public override getDebug(): string {
    return String(this.getContent())
  }
}

export class UnitLiteral extends StringLiteral {
  type: NodeType = `UnitLiteral`
  public unit: IUnit

  constructor(unit: IUnit, ...tokens: Token[]) {
    super(...tokens)
    this.unit = unit
  }

  public override constructClone(options): this {
    return new UnitLiteral(this.unit, ...this.tokens.map(token => token.clone())) as this
  }

  public override getDebug(): string {
    return this.unit.toString()
  }
}
