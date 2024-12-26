import assert from "assert"
import { AnyObject, Arguments, MaybeUndefined } from "tsdef"

import type Interpreter from ".."

import { Node } from "../../tree"
import { FunctionProvider, GetFunction, GetKey } from "../../utils"
import Environment from "../environment"
import { RuntimeEvaluation, RuntimeValue } from "../runtime"

export { RuntimeEvaluation, RuntimeValue, NumericValue, BooleanValue, StringValue, UnitValue, VariableValue, QuantityValue, UndefinedValue, FunctionValue, ObjectValue } from "../runtime"
export type { Contextualized, RuntimeFunction, makeRuntimeValue } from "../runtime"

export type EvaluationOutput<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> = RuntimeEvaluation<TRuntimeValue> | MaybeUndefined<TRuntimeValue>

export type EvaluationFunction = (i: Interpreter, node: Node, environment: Environment) => EvaluationOutput
export type NodeConversionFunction<TNode extends Node = Node, TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> = (i: Interpreter, value: TRuntimeValue) => TNode

export type NodeReadyCheckerFunction = (i: Interpreter, node: Node) => boolean
export type EvaluatorReadyCheckerFunction = (i: Interpreter, evaluation: RuntimeEvaluation) => boolean
export type ReadyCheckerFunction = EvaluatorReadyCheckerFunction | NodeReadyCheckerFunction

export type BaseEvaluationsProvider = Record<string, (...args: any[]) => EvaluationOutput>
export type BaseNodeConversionsProvider = Record<string, NodeConversionFunction<Node, RuntimeValue<any>>>
export type BaseReadyCheckerProvider = Record<string, ReadyCheckerFunction>

export class NodeEvaluator<TEvaluations extends BaseEvaluationsProvider, TConversions extends BaseNodeConversionsProvider, TReadyChecker extends BaseReadyCheckerProvider = BaseReadyCheckerProvider> {
  evaluationsProvider: FunctionProvider<TEvaluations>
  conversionsProvider: FunctionProvider<TConversions>
  readyCheckersProvider: FunctionProvider<TReadyChecker>

  constructor() {
    this.evaluationsProvider = new FunctionProvider()
    this.conversionsProvider = new FunctionProvider()
    this.readyCheckersProvider = new FunctionProvider()
  }

  // #region CORE

  /** Add multiple functions to index */
  public addDictionary<TDict extends BaseEvaluationsProvider>(type: `evaluations`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseNodeConversionsProvider>(type: `conversions`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseReadyCheckerProvider>(type: `readyCheckers`, dict: TDict, override?: boolean): void
  public addDictionary<TDict extends BaseEvaluationsProvider | BaseNodeConversionsProvider | BaseReadyCheckerProvider>(type: `evaluations` | `conversions` | `readyCheckers`, dict: TDict, override?: boolean): void {
    if (type === `evaluations`) this.evaluationsProvider.addDictionary(dict, override)
    else if (type === `conversions`) this.conversionsProvider.addDictionary(dict, override)
    else if (type === `readyCheckers`) this.readyCheckersProvider.addDictionary(dict, override)
  }

  public addDictionaries<TEvaluations extends AnyObject, TConversions extends AnyObject, TReadyChecker extends AnyObject>(
    { evaluations, conversions, readyCheckers }: { evaluations: TEvaluations; conversions: TConversions; readyCheckers: TReadyChecker },
    override?: boolean,
  ): void {
    this.addDictionary(`evaluations`, evaluations, override)
    this.addDictionary(`conversions`, conversions, override)
    this.addDictionary(`readyCheckers`, readyCheckers, override)
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

  /** Checks if evaluation output is ready (i.e. doesn't need more work) */
  public isReady(i: Interpreter, evaluation: RuntimeEvaluation): boolean
  public isReady(i: Interpreter, node: Node): boolean
  public isReady(i: Interpreter, evaluationOrTree: RuntimeEvaluation | Node): boolean {
    if (RuntimeEvaluation.isRuntimeEvaluation(evaluationOrTree)) {
      const isEvaluationReady = this.readyCheckersProvider.getFunction(`isEvaluationReady`) as EvaluatorReadyCheckerFunction
      return isEvaluationReady(i, evaluationOrTree)
    } else {
      const isNodeReady = this.readyCheckersProvider.getFunction(`isNodeReady`) as NodeReadyCheckerFunction
      return isNodeReady(i, evaluationOrTree)
    }
  }
}
