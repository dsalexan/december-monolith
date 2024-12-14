import { MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { Expression, ExpressionStatement, Node, Statement } from "../tree"
import Environment from "./environment"
import { RuntimeValue } from "./valueTypes"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { default as Environment } from "./environment"
export type { RuntimeValue, NumericValue, StringValue, FunctionValue } from "./valueTypes"
export { isNumericValue, isStringValue, isFunctionValue } from "./valueTypes"

export { evaluate as DEFAULT_EVALUATE, runtimeValueToNode as DEFAULT_RUNTIME_TO_NODE } from "./default"

export interface InterpreterOptions {
  logger: typeof _logger
}

export type EvaluationFunction = (i: Interpreter, node: Node, environment: Environment) => RuntimeValue<any> | Node
export type ParseToNodeFunction<TRuntimeValue extends RuntimeValue<any>> = (i: Interpreter, value: TRuntimeValue) => Node

export default class Interpreter {
  public options: InterpreterOptions
  //
  private environment: Environment
  private AST: Node
  public evaluate: EvaluationFunction
  protected _runtimeValueToNode: ParseToNodeFunction<RuntimeValue<any>>
  //
  public result: Node

  public process(AST: Node, environment: Environment, evaluateFunction: EvaluationFunction, runtimeValueToNode: ParseToNodeFunction<RuntimeValue<any>>, options: WithOptionalKeys<InterpreterOptions, `logger`>) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    }

    this.AST = AST
    this.environment = environment

    this.evaluate = evaluateFunction
    this._runtimeValueToNode = runtimeValueToNode

    this.result = this.interpret()

    return this.result
  }

  public runtimeValueToNode<TRuntimeValue extends RuntimeValue<any>>(i: Interpreter, value: TRuntimeValue): Node {
    return this._runtimeValueToNode(i, value)
  }

  protected interpret() {
    const result = this.evaluate(this, this.AST, this.environment)

    let statement: Statement
    if (!Node.isNode(result)) {
      const expression = this.runtimeValueToNode(this, result)
      assert(expression instanceof Expression, `This should be an Expression`)

      statement = new ExpressionStatement(expression)
    } else if (!(result instanceof Statement)) throw new Error(`Result of interpretation must be a Statement.`)
    else statement = result

    return statement
  }

  public print() {
    const logger = _logger

    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`INTERPRETED AST`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    console.log(` `)

    this.result.print()
    // logger.add(paint.grey(this.result.type)).info()
    // logger.add(paint.white.bold(this.result.value)).info()
  }
}
