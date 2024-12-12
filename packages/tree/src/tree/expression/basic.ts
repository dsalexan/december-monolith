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
}

export class StringLiteral extends Expression {
  type: NodeType = `StringLiteral`
  public values: Token[]

  constructor(...values: Token[]) {
    super()
    this.values = values
  }
}

export class Property extends Expression {
  type: NodeType = `Property`

  constructor(key: Expression, value?: Expression) {
    super()
    this.addChild(key, 0)
    if (value) this.addChild(value, 1)
  }

  public get key(): Expression {
    return this.children[0]
  }

  public get value(): MaybeUndefined<Expression> {
    return this.children[1]
  }
}
