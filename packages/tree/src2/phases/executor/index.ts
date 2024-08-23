import assert from "assert"
import { filter, isNil, range } from "lodash"
import { Interval, Point, Range } from "@december/utils"

import churchill, { Block, paint, Paint } from "../../logger"

import { PrintOptions } from "../../tree/printer"
import Tree from "../../tree"
import Node from "../../node"

import type { BaseProcessingOptions } from "../../options"

import SymbolTable from "../semantic/symbolTable"
import Environment from "../../environment"
import { postOrder } from "../../node/traversal"
import { getMasterScope, MasterScope, Scope } from "../../node/scope"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

/*
 * 4) TODO: SIMPLIFIER
 *    The simplifier is a tool that can simplify an expression.
 *    It is a TERM REWRITE SYSTEM (https://stackoverflow.com/questions/7540227/strategies-for-simplifying-math-expressions)
 *    There is a list of rules, that contains a pattern and a replacement (regex maybe?). Use special symbols as pattern variables,
 *      which need to get bound during pattern matching (scanning or parsing???) and replaced in the replacement expression.
 *
 *    TRY TO REWRITE EXPRESSION TO A NORMAL FORM
 *        (https://en.wikipedia.org/wiki/Conjunctive_normal_form)
 *        Conjunctive Normal Form (CNF) is a standard form of expression in logic, where each expression is a conjunction of clauses.
 *
 *      Don't forget, that this approach works to a certain point, but is likely to be non complete. This is due to the fact,
 *      that all of the following rules perform local term rewrites.
 *
 *      To make this local rewrite logic stronger, one should try to transform expressions into something I'd call a normal form.
 *      This is my approach:
 *
 *        - If a term contains literal values, try to move the term as far to the right as possible.
 *        - Eventually, this literal value may appear rightmost and can be evaluated as part of a fully literal expression.
 *
 * - RULES
 * - BINDING ENVIRONMENT — Something to bind variables to values. Maybe bind any node to a value (like, functions)
 *
 * - AST -> Simplified AST
 *
 * */

export interface BaseExecutorOptions {}

export type ExecutorOptions = BaseExecutorOptions & BaseProcessingOptions

export default class Executor {
  public options: ExecutorOptions
  //
  private tree: Tree
  private symbolTable: SymbolTable
  private environment: Environment
  public result: any
  //

  constructor() {}

  /** Defaults options for parser */
  _options(options: Partial<ExecutorOptions>) {
    this.options = {
      logger: options.logger ?? _logger,
      scope: options.scope!,
    }

    return this.options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(tree: Tree, symbolTable: SymbolTable, environment: Environment, options: Partial<ExecutorOptions> = {}) {
    this._options(options) // default options

    this.tree = tree
    this.symbolTable = symbolTable
    this.environment = environment

    this._process()

    return this.result
  }

  /** Process Node into some value */
  private _processNode(node: Node) {
    assert(node, `Node must be defined`)

    const scope = node.scope(this.options.scope)
    const master = getMasterScope(scope)

    const instruction = this._getNodeInstruction(node, { master, all: scope })

    return this._processNodeInstruction(instruction, node, { master, all: scope })
  }

  /** Get instruction for node processing based on scope */
  private _getNodeInstruction(node: Node, { master, all: scope }: { master: MasterScope; all: Scope[] }): NodeInstruction {
    if (node.type.name === `root`) {
      assert(node.children.length === 1, `Root node must have exactly one child`) // confirm unarity

      return PROCESS_CHILD()
    } else if (node.type.id === `literal`) {
      // TODO: Implement literality function in Environment

      if (master !== `math`) debugger

      if (node.type.name === `number` || node.type.name === `signed_number`) return GET_VALUE(`number`)
      else if (node.type.name === `string` || node.type.name === `string_collection`) throw new Error(`Unimplemented string type`)
      else throw new Error(`Unimplemented literal type "${node.type.name}"`)
      //
    } else if (node.type.id === `operator`) {
      if (master !== `math`) throw new Error(`Unimplemented NON-MATH operator type "${node.type.name}"`)

      if (node.type.modules.includes(`arithmetic`)) return ELEMENTARY_ALGEBRA()
      else if (node.type.modules.includes(`logical`)) return ELEMENTARY_ALGEBRA()
    } else if (node.type.id === `separator`) {
      if (master !== `math`) throw new Error(`Unimplemented NON-MATH separator type "${node.type.name}"`)

      if (node.type.modules.includes(`wrapper`)) {
        if (node.children.length === 1) return PROCESS_CHILD()
        else debugger
      } else debugger
    }

    throw new Error(`Unimplemented processing for node type "${node.type.getFullName()}"`)
  }

  /** Effectivelly process node + instruction */
  private _processNodeInstruction(instruction: NodeInstruction, node: Node, { master, all: scope }: { master: MasterScope; all: Scope[] }) {
    if (instruction.protocol === `process-child`) return this._processNode(node.children[0])
    else if (instruction.protocol === `get-value`) {
      const stringValue = node.content! as string

      if (instruction.type === `string`) return stringValue
      else if (instruction.type === `number`) {
        const numericValue: number = parseFloat(stringValue)

        assert(!isNaN(numericValue), `Invalid number value conversion "${stringValue}" -> "${numericValue}"`)

        return numericValue
      } else if (instruction.type === `boolean`) return stringValue.toLowerCase() === `true` || stringValue === `1` ? true : false
      //
    } else if (instruction.protocol === `elementary-algebra`) {
      assert(node.syntactical!.narity === 2, `Elementary algebra requires two operands`)

      const [_left, _right] = node.children

      const left = this._processNode(_left)
      const right = this._processNode(_right)

      // TODO: Probably check if both operands are of the same type???

      // arithmetic operations
      if (node.type.name === `addition`) return left + right
      else if (node.type.name === `subtraction`) return left - right
      else if (node.type.name === `multiplication`) return left * right
      else if (node.type.name === `division`) return left / right
      // logical operations
      if (node.type.name === `equals`) return left === right
      //
      else throw new Error(`Unimplemented elementary algebra operation "${node.type.name}"`)
    }

    throw new Error(`Unimplemented processing protocol "${instruction.protocol}"`)
  }

  /** Process tree with data from environment */
  private _process() {
    this.result = this._processNode(this.tree.root)
  }

  print(options: PrintOptions = {}) {
    const logger = _logger

    // 1. Print expression
    console.log(` `)
    logger.add(paint.gray(range(0, this.tree.expression.length).join(` `))).info()
    logger.add(paint.gray([...this.tree.expression].join(` `))).info()
    console.log(` `)

    // 3. Print Scope
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`ENVIRONMENT`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    console.log(this.environment)

    // 3. Print Abstract Tree
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`RESULT`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    _logger.add(paint.white(this.result)).info()
  }
}

interface BaseNodeInstruction {
  protocol: string
}

interface GenericNodeInstruction extends BaseNodeInstruction {
  protocol: `process-child` | `elementary-algebra`
}

interface GetValueNodeInstruction extends BaseNodeInstruction {
  protocol: `get-value`
  type: `string` | `number` | `boolean`
}

type NodeInstruction = GenericNodeInstruction | GetValueNodeInstruction

type TNodeInstructionFactory<TInstruction extends NodeInstruction = NodeInstruction> = (...args: any[]) => TInstruction

const GET_VALUE: TNodeInstructionFactory<GetValueNodeInstruction> = (type: GetValueNodeInstruction[`type`]) => ({ protocol: `get-value`, type })
const PROCESS_CHILD: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `process-child` })
const ELEMENTARY_ALGEBRA: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `elementary-algebra` })
