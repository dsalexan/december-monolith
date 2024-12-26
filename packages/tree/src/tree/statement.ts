import { Node, NodeCloneOptions } from "./node"
import { NodeType } from "./type"
import { Expression } from "./expression"

import { Block } from "../logger"

/** Statements do not result in a value at runtime. They contain one or more expressions internally */
export class Statement extends Node {
  public static isStatement(value: any): value is Statement {
    return value instanceof Statement
  }
}

/** One expression to be evaluated. Kind of a "root" node or a "line" node */
export class ExpressionStatement extends Statement {
  type: NodeType = `ExpressionStatement`

  constructor(expression: Expression) {
    super()

    this.addChild(expression, 0, `expression`)
  }

  public override constructClone(options): this {
    return new ExpressionStatement(this.expression.clone(options)) as this
  }

  public get expression(): Expression {
    return this.children[0]
  }

  public override toBlocks(): Block[] {
    return this.expression.toBlocks()
  }
}
