import type Interpreter from ".."

import { Node } from "../../tree"
import Environment from "../environment"
import { FunctionProvider, GetFunction, GetKey } from "../../utils"
import { RuntimeValue } from ".."
import assert from "assert"

export type EvaluationFunction = (i: Interpreter, node: Node, environment: Environment) => RuntimeValue<any> | Node
export type NodeConversionFunction<TRuntimeValue extends RuntimeValue<any>> = (i: Interpreter, value: Omit<TRuntimeValue, `node`>) => Node

export type BaseEvaluatorProvider = Record<string, (...args: any[]) => Node>
// export interface BaseEvaluatorProvider {
//   evaluate: EvaluationFunction
//   convertToNode: NodeConversionFunction<RuntimeValue<any>>
// }

export class NodeEvaluator<TDict extends BaseEvaluatorProvider> extends FunctionProvider<TDict> {
  constructor() {
    super()
  }

  public get evaluate(): EvaluationFunction {
    return this.getFunction(`evaluate`)
  }

  public convertToNode<TRuntimeValue extends RuntimeValue<any>>(i: Interpreter, value: Omit<TRuntimeValue, `node`>): Node {
    const convertToNode = this.getFunction(`convertToNode`)
    return convertToNode(i, value)
  }

  /** Returns syntactical parser function by name */
  public override call<TKey extends GetKey<TDict> = GetKey<TDict>>(name: TKey): GetFunction<TDict, TKey> {
    assert(name !== `evaluate` && name !== `convertToNode`, `Use evaluate or convertToNode directly`)

    return super.call(name)
  }
}
