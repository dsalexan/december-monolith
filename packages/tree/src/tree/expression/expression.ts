import { Node } from "../node"

import { Block } from "../../logger"
import { NodeType } from "../type"

/** Expressions will result in a value at runtime unlike Statements */
export class Expression extends Node {
  public static isExpression(value: any): value is Expression {
    return value instanceof Expression
  }
}
