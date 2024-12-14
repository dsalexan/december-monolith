import { MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { ExpressionStatement, Node, Statement } from "../tree"
import Environment from "./environment"
import { parseRuntimeValueToExpression, RuntimeValue } from "./valueTypes"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { default as Environment } from "./environment"
export type { RuntimeValue, NumericValue, StringValue, FunctionValue } from "./valueTypes"
export { isNumericValue, isStringValue, isFunctionValue } from "./valueTypes"

export { evaluate as DEFAULT_EVALUATE } from "./default"

export interface InterpreterOptions {
  logger: typeof _logger
}

export type EvaluationFunction = (i: Interpreter, node: Node, environment: Environment) => RuntimeValue<any> | Node

export default class Interpreter {
  public options: InterpreterOptions
  //
  private environment: Environment
  private AST: Node
  public evaluate: EvaluationFunction
  //
  public result: Node

  public process(AST: Node, environment: Environment, evaluateFunction: EvaluationFunction, options: WithOptionalKeys<InterpreterOptions, `logger`>) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    }

    this.AST = AST
    this.environment = environment
    this.evaluate = evaluateFunction

    this.result = this.interpret()

    return this.result
  }

  protected interpret() {
    const result = this.evaluate(this, this.AST, this.environment)

    let statement: Statement
    if (!Node.isNode(result)) {
      const expression = parseRuntimeValueToExpression(result)
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
