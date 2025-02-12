import { expression } from "mathjs"
import { Node, NodeCloneOptions, NodeContentOptions } from "../node"

import { Block } from "../../logger"
import { NodeType } from "../type"
import type { ExpressionStatement } from "../statement"

/** Expressions will result in a value at runtime unlike Statements */
export class Expression extends Node {
  public static isExpression(value: any): value is Expression {
    return value instanceof Expression
  }

  public static extractExpression(node: Node): Expression {
    const type = node.type

    if (Expression.isExpression(node)) return node
    if (type === `ExpressionStatement`) return (node as ExpressionStatement).expression

    throw new Error(`Nothing in node tree is an expression`)
  }
}

export class ExpressionList extends Node {
  type: NodeType = `ExpressionList`

  public constructor(...expression: Expression[]) {
    super()

    for (const [index, child] of expression.entries()) {
      this.addChild(child, index, `expression${index}`)
    }
  }

  public static isExpressionList(value: any): value is ExpressionList {
    return value instanceof ExpressionList
  }

  public constructClone(options?: NodeCloneOptions): this {
    const clone = new ExpressionList(...this.children.map(child => child.clone(options))) as this

    return clone
  }

  public get expressions(): Expression[] {
    return this.children as Expression[]
  }

  public override getContent({ depth, separator, wrap }: NodeContentOptions = {}): string {
    const expressions = this.expressions.map(expression => expression.getContent({ depth, separator, wrap }))

    return `${expressions.join(`, `)}`
  }
}
