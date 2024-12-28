import { Node } from "../node"

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
