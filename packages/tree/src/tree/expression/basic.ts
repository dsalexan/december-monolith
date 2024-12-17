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

  public get value(): Token {
    return this.tokens[0]
  }

  constructor(value: Token) {
    super()
    this.tokens = [value]
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

  public override getDebug(): string {
    return this.getContent()
  }
}

export class StringLiteral extends Expression {
  type: NodeType = `StringLiteral`

  constructor(...tokens: Token[]) {
    super()
    this.tokens = [...tokens]
  }

  public getValue(): string {
    return this.getContent()
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
    return this.tokens
  }

  public getValue(): string {
    throw new Error(`Don't use this method for identifiers.`)
  }

  public getVariableName(): string {
    return this.getContent()
  }
}

export class UnitLiteral extends StringLiteral {
  type: NodeType = `UnitLiteral`
  public unit: IUnit

  constructor(unit: IUnit, ...tokens: Token[]) {
    super(...tokens)
    this.unit = unit
  }

  public override getDebug(): string {
    return this.unit.toString()
  }
}
