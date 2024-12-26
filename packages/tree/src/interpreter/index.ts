import { AnyObject, MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { Expression, ExpressionStatement, Node, Statement } from "../tree"
import Environment, { VariableName } from "./environment"
import { EvaluationFunction, NodeConversionFunction, NodeEvaluator, RuntimeEvaluation, RuntimeValue } from "./evaluator"
import { Simbol, SymbolTable } from "../symbolTable"
import type Parser from "../parser"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { default as Environment, VARIABLE_NOT_FOUND } from "./environment"
export type { VariableName } from "./environment"

export type { EvaluationFunction, NodeConversionFunction, ReadyCheckerFunction, EvaluationOutput, makeRuntimeValue } from "./evaluator"
export { NodeEvaluator, RuntimeEvaluation, NumericValue, StringValue, FunctionValue, ObjectValue, BooleanValue, UndefinedValue, VariableValue, UnitValue, QuantityValue, RuntimeValue } from "./evaluator"
export type { Contextualized, RuntimeFunction } from "./evaluator"
export { DEFAULT_EVALUATOR, DEFAULT_EVALUATIONS, DEFAULT_NODE_CONVERSORS, DEFAULT_READY_CHECKERS } from "./evaluator/default"
export type { DefaultEvaluatorProvider } from "./evaluator/default"

export interface InterpreterOptions {
  logger: typeof _logger
  isValidFunctionName?: (functionName: string) => boolean
}

export default class Interpreter<TEvaluationsDict extends AnyObject = any, TOptions extends WithOptionalKeys<InterpreterOptions, `logger`> = WithOptionalKeys<InterpreterOptions, `logger`>> {
  public options: TOptions
  //
  public id: string
  private AST: Node
  private environment: Environment
  private symbolTable: SymbolTable
  public evaluator: NodeEvaluator<TEvaluationsDict, AnyObject>
  public parser: Parser
  //
  public result: RuntimeEvaluation<RuntimeValue<any>, Statement>

  public process<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(
    id: string,
    AST: Node,
    environment: Environment,
    symbolTable: SymbolTable,
    evaluator: NodeEvaluator<TEvaluationsDict, AnyObject>,
    parser: Parser,
    options: WithOptionalKeys<TOptions, `logger`>,
  ) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    } as TOptions

    this.id = id
    this.AST = AST
    this.environment = environment
    this.symbolTable = symbolTable
    this.evaluator = evaluator
    this.parser = parser

    const result = this.interpret<TRuntimeValue>()
    this.result = result

    return result
  }

  protected interpret<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(): RuntimeEvaluation<TRuntimeValue, Statement> {
    // 1. Evaluate AST (using externally provided node evaluator instance)
    const result = this.evaluator.evaluate(this, this.AST, this.environment)
    assert(result !== undefined, `Result of interpretation cannot be undefined.`) // COMMENT

    // Evaluation output is a RuntimeEvaluation. It always as a equivalent NODE, and it can have a RUNTIME_VALUE.
    //    - If it has a RUNTIME_VALUE, it means that the node was successfully resolved into something.
    //    - If it does not have a RUNTIME_VALUE, it means that the node could not be resolved into a value. More work is necessary.
    //    - Any output will have a NODE, indicating the "final form" of the SUB_TREE after all evaluations.
    //    - That NODE can be a statement or an expression.

    let interpretationEvaluation: RuntimeEvaluation<TRuntimeValue, Statement>

    // 2. If result is RESOLVED, repack runtimeValue into an expression (since it yields a value) and that expression into a statement
    if (RuntimeEvaluation.isResolved(result)) {
      const expression = this.evaluator.convertToNode(this, result.runtimeValue)
      assert(expression instanceof Expression, `Anything that yields a value is an expression dude`) // COMMENT

      const expressionStatement = new ExpressionStatement(expression)
      interpretationEvaluation = new RuntimeEvaluation(result.runtimeValue as TRuntimeValue, expressionStatement)
    }
    // 3. If it is UNRESOLVED, just return the original node (repacking as statement if necessary)
    else {
      let statement: Statement = result.node as Statement
      if (!Statement.isStatement(result.node)) statement = new ExpressionStatement(result.node as Expression)
      interpretationEvaluation = new RuntimeEvaluation(null as any, statement)
    }

    return interpretationEvaluation
  }

  /** Checks (through nodeEvaluator) if evaluationOutput is ready (i.e. doesn't require any more work) */
  public isReady(evaluation: RuntimeEvaluation<RuntimeValue<any>, Statement>): boolean
  public isReady(tree: Node): boolean
  public isReady(evaluationOrTree: RuntimeEvaluation<RuntimeValue<any>, Statement> | Node): boolean {
    return this.evaluator.isReady(this, evaluationOrTree as any)
  }

  /** Index a variable name in SymbolTable  */
  public indexVariableNameAsSymbol(variableName: VariableName, node: Node) {
    const treeName: string = this.id

    this.symbolTable.index(variableName, treeName, node)
  }

  /** Checks if function name is a VALID function name (otherwise it will become part of a string) */
  public isValidFunctionName(functionName: string) {
    const fn = this.options.isValidFunctionName ?? ((fn: string) => true)
    return fn(functionName)
  }

  public print() {
    const logger = _logger

    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`INTERPRETED AST (${this.id})`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    console.log(` `)

    if (this.isReady(this.result)) _logger.add(paint.green(`Ready`)).info()
    else _logger.add(paint.yellow.bold(`NOT READY!`)).info()

    _logger.add(paint.grey(`RuntimeValue: `))

    if (this.result.runtimeValue) {
      _logger.add(this.result.runtimeValue.getContent()).add(paint.dim.grey(` (${this.result.runtimeValue.type})`))
    } else {
      _logger.add(paint.red.bold(`(unresolved)`))
    }

    _logger.info()
    this.result.node.print()
    // logger.add(paint.grey(this.result.type)).info()
    // logger.add(paint.white.bold(this.result.value)).info()
  }
}
