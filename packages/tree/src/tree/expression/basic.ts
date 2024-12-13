import { MaybeUndefined } from "tsdef"
import { NODE_TYPE_COLOR, NodeType } from "../type"
import { Expression } from "./expression"

import { Block, paint } from "../../logger"
import { Token } from "../../token/core"

export class Identifier extends Expression {
  type: NodeType = `Identifier`
  public variableName: Token

  constructor(variableName: Token) {
    super()
    this.variableName = variableName
  }

  public override getDebug(): string {
    return `{${this.variableName.content}}`
  }
}

export class NumericLiteral extends Expression {
  type: NodeType = `NumericLiteral`
  public value: Token

  constructor(value: Token) {
    super()
    this.value = value
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

  public override getDebug(): string {
    return this.values.map(value => value.content).join(``)
  }
}
