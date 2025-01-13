import { Nullable } from "tsdef"

import { Node, Statement } from "../../tree"

import { RuntimeValue } from "./base"
import type Interpreter from ".."

/** A RUNTIME_EVALUTION is the OUTPUT of an evaluation
 *
 * NODE is the original node that was evaluated.
 * RUNTIME_VALUE is the value that was resolved from the node.
 *
 * It is considered RESOLVED if it has a RUNTIME_VALUE. Otherwise, it is not resolved.
 *    (some node down the tree could not be successfully evaluated, which in turn makes the whole tree not resolved)
 *
 * An UNRESOLVED evaluation lacks a RUNTIME_VALUE, and its node MUST BE a STATEMENT.
 *
 * Theoretically it is possible to generate a EVALUATION_TREE, by printing all outputs for each node in the AST.
 * Not much use for this outside debugging.
 *
 *
 */

export interface ResolvedRuntimeEvaluation<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>, TNode extends Node = Node> {
  runtimeValue: TRuntimeValue
  node: TNode
}

export class RuntimeEvaluation<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>, TNode extends Node = Node> {
  readonly node: TNode
  readonly runtimeValue: Nullable<TRuntimeValue> = null

  constructor(node: Node)
  constructor(runtimeValue: Nullable<TRuntimeValue>, node: TNode)
  constructor(runtimeValue: Nullable<TRuntimeValue> | TNode, node?: TNode) {
    if (runtimeValue === null || RuntimeValue.isRuntimeValue(runtimeValue)) {
      this.runtimeValue = runtimeValue
      this.node = node as TNode
    } else {
      this.runtimeValue = null as any
      this.node = runtimeValue as TNode
    }
  }

  public static isRuntimeEvaluation<TRuntimeValue extends RuntimeValue<any>>(evaluation: any): evaluation is RuntimeEvaluation<TRuntimeValue> {
    return evaluation instanceof RuntimeEvaluation
  }

  public static isResolved<TRuntimeValue extends RuntimeValue<any>>(evaluation: RuntimeEvaluation<TRuntimeValue>): evaluation is RuntimeEvaluation<TRuntimeValue> & ResolvedRuntimeEvaluation<TRuntimeValue> {
    return RuntimeEvaluation.isRuntimeEvaluation(evaluation) && evaluation.runtimeValue !== null
  }

  public isResolved(): this is this & ResolvedRuntimeEvaluation<TRuntimeValue> {
    return RuntimeEvaluation.isResolved(this)
  }

  public toNode<TNode extends Node = Node>(i: Interpreter): TNode {
    // 1. If value is resolved, just pack data into node (since it could be different than original node)
    if (RuntimeEvaluation.isResolved(this)) return i.evaluator.convertToNode(i, this.runtimeValue, this.node)

    // 2. If value was never resolved, just send original node back
    return this.node as any as TNode
  }

  public getContent() {
    if (this.isResolved()) return this.runtimeValue.getContent()

    return this.node.getContent()
  }
}
