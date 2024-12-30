import assert from "assert"
import { AnyObject, Arguments, MaybeUndefined, Nullable } from "tsdef"

import type Interpreter from ".."

import { Expression, Node } from "../../tree"
import { FunctionProvider, GetFunction, GetKey } from "../../utils"
import Environment from "../environment"
import { RuntimeEvaluation, RuntimeValue } from "../runtime"
import { SyntacticalContext } from "../../parser"

export { RuntimeEvaluation, RuntimeValue, NumericValue, BooleanValue, StringValue, UnitValue, VariableValue, QuantityValue, UndefinedValue, FunctionValue, ObjectValue, ExpressionValue, PropertyValue } from "../runtime"
export type { Contextualized, RuntimeFunction, makeRuntimeValue } from "../runtime"

export type EvaluationOutput<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> = RuntimeEvaluation<TRuntimeValue> | MaybeUndefined<TRuntimeValue>

export type EvaluationFunction = (i: Interpreter, node: Node, environment: Environment) => EvaluationOutput
export type NodeConversionFunction<TNode extends Node = Node, TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> = (i: Interpreter, value: TRuntimeValue) => TNode

export type NodeReadyCheckerFunction = (i: Interpreter, node: Node) => boolean
export type EvaluatorReadyCheckerFunction = (i: Interpreter, evaluation: RuntimeEvaluation) => boolean
export type PostProcessFunction = (i: Interpreter, evaluation: RuntimeEvaluation<RuntimeValue<any>, Expression>, syntacticalContext: SyntacticalContext) => Nullable<RuntimeValue<any>>

export type BaseEvaluationsProvider = Record<string, (...args: any[]) => EvaluationOutput>
export type BaseNodeConversionsProvider = Record<string, NodeConversionFunction<Node, RuntimeValue<any>>>
export type BasePostProcessProvider = Record<string, PostProcessFunction>

export class NodeEvaluator<TEvaluations extends BaseEvaluationsProvider, TConversions extends BaseNodeConversionsProvider, TPostProcess extends BasePostProcessProvider = BasePostProcessProvider> {
  evaluationsProvider: FunctionProvider<TEvaluations>
  conversionsProvider: FunctionProvider<TConversions>
  postProcessProvider: FunctionProvider<TPostProcess>

  constructor() {
    this.evaluationsProvider = new FunctionProvider()
    this.conversionsProvider = new FunctionProvider()
    this.postProcessProvider = new FunctionProvider()
  }

  // #region CORE

  /** Add multiple functions to index */
  public addDictionary<TDict extends BaseEvaluationsProvider>(type: `evaluations`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseNodeConversionsProvider>(type: `conversions`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BasePostProcessProvider>(type: `postProcess`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseEvaluationsProvider | BaseNodeConversionsProvider | BasePostProcessProvider>(type: `evaluations` | `conversions` | `postProcess`, dict: TDict, override?: boolean): void {
    if (type === `evaluations`) this.evaluationsProvider.addDictionary(dict, override)
    else if (type === `conversions`) this.conversionsProvider.addDictionary(dict, override)
    else if (type === `postProcess`) this.postProcessProvider.addDictionary(dict, override)
  }

  public addDictionaries<TEvaluations extends AnyObject, TConversions extends AnyObject, TPostProcess extends AnyObject>(
    { evaluations, conversions, postProcess }: { evaluations: TEvaluations; conversions: TConversions; postProcess: TPostProcess },
    override?: boolean,
  ): void {
    this.addDictionary(`evaluations`, evaluations, override)
    this.addDictionary(`conversions`, conversions, override)
    this.addDictionary(`postProcess`, postProcess, override)
  }

  // #endregion

  /** Exposes conversion method for RuntimeValue -> Node */
  public convertToNode<TNode extends Node = Node, TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(i: Interpreter, value: TRuntimeValue): TNode {
    const convertToNode = this.conversionsProvider.getFunction(`convertToNode`)
    return convertToNode(i, value) as TNode
  }

  /** Evaluates a generic node */
  public evaluate(i: Interpreter, node: Node, environment: Environment): RuntimeEvaluation {
    const evaluate = this.evaluationsProvider.getFunction(`evaluate`)
    return evaluate(i, node, environment) as RuntimeEvaluation
  }

  /** Calls a specific evaluation method by name */
  public call<TKey extends GetKey<TEvaluations> = GetKey<TEvaluations>>(fnName: TKey, ...args: Arguments<GetFunction<TEvaluations, TKey>>): ReturnType<GetFunction<TEvaluations, TKey>> {
    assert(fnName !== `evaluate` && fnName !== `convertToNode`, `Use evaluate or convertToNode directly`)

    const fn = this.evaluationsProvider.getFunction(fnName)
    return fn(...args) as ReturnType<GetFunction<TEvaluations, TKey>>
  }

  /** Post-process to derive some sort of "final" RuntimeValue */
  public postProcess(i: Interpreter, runtimeEvaluation: RuntimeEvaluation<RuntimeValue<any>, Expression>, syntacticalContext: SyntacticalContext): Nullable<RuntimeValue<any>> {
    const postProcess = this.postProcessProvider.getFunction(`postProcess`) as PostProcessFunction
    return postProcess(i, runtimeEvaluation, syntacticalContext)
  }
}
