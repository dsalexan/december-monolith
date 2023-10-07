/* eslint-disable no-debugger */
import { ConstantNode, MathNode, OperatorNode, replacer, reviver } from "mathjs"
import { MathScope, PostProcessedMathNode } from "."
import { ImplicitOption, ParenthesisOption, calculateNecessaryParentheses } from "./utils"

export type SerializedMathObject = {
  expression: string
  node: object
  scope: object
}

export type NodeTypes = `OperatorNode` | `FunctionNode` | `SymbolNode` | `ConstantNode` | `ParenthesisNode`

export default class MathObject {
  expression: string
  node: PostProcessedMathNode
  scope: MathScope

  constructor(expression: string, node: PostProcessedMathNode, scope: MathScope) {
    this.expression = expression
    this.node = node
    this.scope = scope
  }

  // #region SERIALIZATION

  serialize() {
    const stringifiedNode = JSON.stringify(this.node, replacer)

    const serialized = {
      expression: this.expression,
      node: JSON.parse(stringifiedNode),
      scope: Object.fromEntries(this.scope),
    } as SerializedMathObject

    return serialized
  }

  static deserialize(serialized: SerializedMathObject) {
    const node = JSON.parse(JSON.stringify(serialized.node), reviver)
    const scope = new Map(Object.entries(serialized.scope))

    const mathObject = new MathObject(serialized.expression, node, scope)

    return mathObject
  }

  // #endregion
}
