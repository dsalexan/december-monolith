import { MaybeUndefined } from "tsdef"
import assert from "assert"

import { IUnit } from "@december/utils/unit"

import { NODE_TYPE_COLOR, NodeType } from "../type"
import { Expression } from "./expression"

import { Block, paint } from "../../logger"
import { Token } from "../../token/core"

export class BooleanLiteral extends Expression {
  type: NodeType = `BooleanLiteral`
  public value: boolean

  constructor(value: boolean) {
    super()
    this.value = value
  }

  public getValue(): boolean {
    return this.value
  }

  public override getDebug(): string {
    return String(this.value)
  }
}

export class NumericLiteral extends Expression {
  type: NodeType = `NumericLiteral`
  public value: Token

  constructor(value: Token) {
    super()
    this.value = value
  }

  public getValue(): number {
    const numericValue = parseFloat(this.value.content)
    assert(!isNaN(numericValue), `Invalid numeric value: ${this.value.content}`)

    return numericValue
  }

  public override toBlocks(): Block[] {
    const color = NODE_TYPE_COLOR[this.type] ?? paint.red
    return [color(this.value.toString())]
  }

  public override getDebug(): string {
    return this.value.content
  }
}

export class StringLiteral extends Expression {
  type: NodeType = `StringLiteral`
  public values: Token[]

  constructor(...values: Token[]) {
    super()
    this.values = values
  }

  public getValue(): string {
    return this.values.map(value => value.content).join(``)
  }

  public override getContent(): string {
    return this.getValue()
  }

  public override getDebug(): string {
    return this.getContent()
  }
}

export class Identifier extends StringLiteral {
  type: NodeType = `Identifier`

  constructor(...variableNameTokens: Token[]) {
    super(...variableNameTokens)
  }

  public get variableNameTokens(): Token[] {
    return this.values
  }
}

export class UnitLiteral extends StringLiteral {
  type: NodeType = `UnitLiteral`
  public unit: IUnit

  constructor(unit: IUnit, ...values: Token[]) {
    super(...values)
    this.unit = unit
  }

  public override getContent(): string {
    return super.getContent()
  }

  public override getDebug(): string {
    return this.unit.toString()
  }
}
