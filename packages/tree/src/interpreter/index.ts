import { AnyObject, MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { Expression, ExpressionStatement, Node, Statement } from "../tree"
import Environment from "./environment"
import { RuntimeValue } from "./valueTypes"
import { EvaluationFunction, NodeConversionFunction, NodeEvaluator } from "./evaluator"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { default as Environment } from "./environment"
export type { RuntimeValue, NumericValue, StringValue, FunctionValue } from "./valueTypes"
export { isNumericValue, isStringValue, isFunctionValue, createNumericValue } from "./valueTypes"

export type { EvaluationFunction, NodeConversionFunction } from "./evaluator"
export { NodeEvaluator } from "./evaluator"
export { DEFAULT_EVALUATOR, DEFAULT_EVALUATIONS, DEFAULT_NODE_CONVERSORS } from "./evaluator/default"
export type { DefaultEvaluatorProvider } from "./evaluator/default"

export interface InterpreterOptions {
  logger: typeof _logger
}

export default class Interpreter<TEvaluatorDict extends AnyObject = any, TOptions extends InterpreterOptions = InterpreterOptions> {
  public options: TOptions
  //
  private environment: Environment
  private AST: Node
  public evaluator: NodeEvaluator<TEvaluatorDict>
  //
  public result: Node

  public process(AST: Node, environment: Environment, evaluator: NodeEvaluator<TEvaluatorDict>, options: WithOptionalKeys<TOptions, `logger`>) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    } as TOptions

    this.AST = AST
    this.environment = environment
    this.evaluator = evaluator

    this.result = this.interpret()

    return this.result
  }

  protected interpret() {
    const result = this.evaluator.evaluate(this, this.AST, this.environment)

    let statement: Statement
    if (!Node.isNode(result) || !(result instanceof Statement)) {
      let expression: Expression

      if (!Node.isNode(result)) expression = this.evaluator.convertToNode(this, result)
      else expression = result

      assert(expression instanceof Expression, `This should be an Expression`)

      statement = new ExpressionStatement(expression)
    } else statement = result

    if (!(statement instanceof Statement)) throw new Error(`Result of interpretation must be a Statement.`)

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

    // _logger.add(this.result.getContent()).info()
    this.result.print()
    // logger.add(paint.grey(this.result.type)).info()
    // logger.add(paint.white.bold(this.result.value)).info()
  }
}
