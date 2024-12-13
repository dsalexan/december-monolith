import { Node } from "./node"
import { NodeType } from "./type"
import { Expression } from "./expression"

import { Block } from "../logger"

/** Statements do not result in a value at runtime. They contain one or more expressions internally */
export class Statement extends Node {}

/** One expression to be evaluated. Kind of a "root" node or a "line" node */
export class ExpressionStatement extends Statement {
  type: NodeType = `ExpressionStatement`

  constructor(expression: Expression) {
    super()

    this.addChild(expression, 0, `expression`)
  }

  public get expression(): Expression {
    return this.children[0]
  }

  public override toBlocks(): Block[] {
    return this.expression.toBlocks()
  }
}

export class IfStatement extends Statement {
  type: NodeType = `IfStatement`

  constructor(condition: Expression, consequent: Expression, alternative?: Expression) {
    super()

    this.addChild(condition, 0, `condition`)
    this.addChild(consequent, 1, `consequent`)
    if (alternative) this.addChild(alternative, 2, `alternative`)
  }

  public get condition(): Expression {
    return this.children[0]
  }

  public get consequent(): Expression {
    return this.children[1]
  }

  public get alternative(): Expression {
    return this.children[2]
  }
}
