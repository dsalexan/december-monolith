import assert from "assert"
import { AnyObject, Arguments, MaybeUndefined } from "tsdef"

import type Interpreter from ".."

import { Node } from "../../tree"
import { FunctionProvider, GetFunction, GetKey } from "../../utils"
import Environment from "../environment"
import { RuntimeEvaluation, RuntimeValue } from "../runtime"

export { RuntimeEvaluation, RuntimeValue, NumericValue, BooleanValue, StringValue, UnitValue, IdentifierValue, QuantityValue, UndefinedValue, FunctionValue } from "../runtime"

export type EvaluationOutput<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> = RuntimeEvaluation<TRuntimeValue> | MaybeUndefined<TRuntimeValue>

export type EvaluationFunction = (i: Interpreter, node: Node, environment: Environment) => EvaluationOutput
export type NodeConversionFunction<TNode extends Node = Node, TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> = (i: Interpreter, value: TRuntimeValue) => TNode

export type BaseEvaluationsProvider = Record<string, (...args: any[]) => EvaluationOutput>
export type BaseNodeConversionsProvider = Record<string, NodeConversionFunction<Node, RuntimeValue<any>>>

export class NodeEvaluator<TEvaluations extends BaseEvaluationsProvider, TConversions extends BaseNodeConversionsProvider> {
  evaluationsProvider: FunctionProvider<TEvaluations>
  conversionsProvider: FunctionProvider<TConversions>

  constructor() {
    this.evaluationsProvider = new FunctionProvider()
    this.conversionsProvider = new FunctionProvider()
  }

  public convertToNode<TNode extends Node = Node, TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(i: Interpreter, value: TRuntimeValue): TNode {
    const convertToNode = this.conversionsProvider.getFunction(`convertToNode`)
    return convertToNode(i, value) as TNode
  }

  /** Returns evaluation function by name */
  public evaluate(i: Interpreter, node: Node, environment: Environment): RuntimeEvaluation {
    const evaluate = this.evaluationsProvider.getFunction(`evaluate`)
    return evaluate(i, node, environment) as RuntimeEvaluation
  }

  /** Returns evaluation function by name */
  public call<TKey extends GetKey<TEvaluations> = GetKey<TEvaluations>>(fnName: TKey, ...args: Arguments<GetFunction<TEvaluations, TKey>>): ReturnType<GetFunction<TEvaluations, TKey>> {
    assert(fnName !== `evaluate` && fnName !== `convertToNode`, `Use evaluate or convertToNode directly`)

    const fn = this.evaluationsProvider.getFunction(fnName)
    return fn(...args) as ReturnType<GetFunction<TEvaluations, TKey>>
  }

  /** Add multiple functions to index */
  public addDictionary<TDict extends BaseEvaluationsProvider>(type: `evaluations`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseNodeConversionsProvider>(type: `conversions`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseEvaluationsProvider | BaseNodeConversionsProvider>(type: `evaluations` | `conversions`, dict: TDict, override?: boolean): void {
    if (type === `evaluations`) this.evaluationsProvider.addDictionary(dict, override)
    else if (type === `conversions`) this.conversionsProvider.addDictionary(dict, override)
  }

  public addDictionaries<TEvaluations extends AnyObject, TConversions extends AnyObject>({ evaluations, conversions }: { evaluations: TEvaluations; conversions: TConversions }, override?: boolean): void {
    this.addDictionary(`evaluations`, evaluations, override)
    this.addDictionary(`conversions`, conversions, override)
  }
}
