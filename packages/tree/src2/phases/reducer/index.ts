import assert from "assert"
import { filter, isBoolean, isNil, isNumber, isString, range } from "lodash"
import { Interval, Point, Range } from "@december/utils"

import churchill, { Block, paint, Paint } from "../../logger"

import { PrintOptions } from "../../tree/printer"
import Tree from "../../tree"
import Node from "../../node"

import type { BaseProcessingOptions } from "../../options"

import Environment from "../../environment"
import { postOrder } from "../../node/traversal"
import { getMasterScope, MasterScope, Scope } from "../../node/scope"
import { BOOLEAN, NUMBER, STRING } from "../../type/declarations/literal"
import Token from "../../token"
import Grammar from "../../type/grammar"
import SymbolTable from "../../environment/symbolTable"
import { IDENTIFIER } from "../../type/declarations/identifier"
import Type from "../../type/base"

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

export interface BaseReducerOptions {}

export type ReducerOptions = BaseReducerOptions & BaseProcessingOptions

export default class Reducer {
  public options: ReducerOptions
  public grammar: Grammar
  //
  private symbolTable: SymbolTable
  private environment: Environment
  private T: Tree
  public RT: Tree
  //

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<ReducerOptions>) {
    this.options = {
      logger: options.logger ?? _logger,
      scope: options.scope!,
    }

    return this.options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(tree: Tree, environment: Environment, options: Partial<ReducerOptions> = {}) {
    this._options(options) // default options

    this.T = tree
    this.environment = environment

    this._process()

    return this.RT
  }

  /** Process Node into some value */
  private _processNode(node: Node): Node | number | string | boolean {
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
    } else if (node.type.id === `identifier`) {
      const identifier = node.content!

      const isSymbol = this.symbolTable.has(identifier)

      assert(isSymbol, `Identifier "${node.content}" is not defined in Symbol Table`)

      return this.environment.has(identifier) ? GET_VALUE(`any`) : PASS()
    } else if (node.type.id === `literal`) {
      // TODO: Implement literality function in Environment

      if (master !== `math`) debugger

      if (node.type.name === `number` || node.type.name === `signed_number`) return GET_VALUE(`number`)
      else if (node.type.name === `string` || node.type.name === `string_collection`) {
        const identifier = node.content!
        const isSymbol = this.symbolTable.has(identifier)

        // if node is a symbol
        if (isSymbol) {
          // first try to get value from Environment
          //    if it is not in Environment, transform it into a identifier

          return this.environment.has(identifier) ? GET_VALUE(`any`, true) : NORMALIZE(IDENTIFIER)
        }

        debugger
      } else throw new Error(`Unimplemented literal type "${node.type.name}"`)
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
  private _processNodeInstruction(instruction: NodeInstruction, node: Node, { master, all: scope }: { master: MasterScope; all: Scope[] }): Node | number | string | boolean {
    if (instruction.protocol === `pass`) return node
    else if (instruction.protocol === `process-child`) return this._processNode(node.children[0])
    else if (instruction.protocol === `normalize`) {
      node.setType(instruction.type) // change node type

      // flat all its children into a string
      const content = node.content!
      const token = new Token(this.grammar, { start: 0, length: content.length, type: instruction.type })
      token.updateExpression(content)

      node.clearTokens()
      node.addToken(token)

      return node
    } else if (instruction.protocol === `get-value`) {
      let stringValue = node.content! as string

      const asIdentifier = instruction.asIdentifier ?? node.type.id === `identifier`

      if (asIdentifier) {
        const identifier = stringValue
        assert(this.environment.has(identifier), `Identifier "${identifier}" is not defined in Environment`)

        stringValue = this.environment.get(identifier) as any
      }

      if (instruction.type === `any`) return stringValue
      else if (instruction.type === `string`) return stringValue
      else if (instruction.type === `number`) {
        const numericValue: number = parseFloat(stringValue)

        assert(!isNaN(numericValue), `Invalid number value conversion "${stringValue}" -> "${numericValue}"`)

        return numericValue
      } else if (instruction.type === `boolean`) return stringValue.toLowerCase() === `true` || stringValue === `1` ? true : false
      //
    } else if (instruction.protocol === `elementary-algebra`) {
      assert(node.syntactical!.narity === 2, `Elementary algebra requires two operands`)

      const [_left, _right] = node.children

      let left = this._processNode(_left) as number | Node
      let right = this._processNode(_right) as number | Node

      if (left instanceof Node || right instanceof Node) {
        if (!(left instanceof Node)) {
          left = Node.fromValue(this.grammar, left.toString(), NUMBER)
          node._replaceWith(0, left)
        }

        if (!(right instanceof Node)) {
          right = Node.fromValue(this.grammar, right.toString(), NUMBER)
          node._replaceWith(1, right)
        }

        return node
      }

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
    this.symbolTable = SymbolTable.from(this.T, this.options.scope)
    const result = this._processNode(this.T.root)

    // encapsulate processed return into a tree
    const tree = new Tree(``)

    if (result instanceof Node) {
      tree.root._addChild(result)
    } else if (isString(result) || isNumber(result) || isBoolean(result)) {
      const type = isString(result) ? STRING : isNumber(result) ? NUMBER : BOOLEAN

      const literal = Node.fromValue(this.grammar, result.toString(), type)

      tree.root._addChild(literal)
    } else throw new Error(`Unimplemented result treatment`)

    // recalculate ranges and final expression
    tree.recalculate()

    this.RT = tree
  }

  print(options: PrintOptions = {}) {
    const logger = _logger

    // 1. Print  Tree
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`REDUCED TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    this.RT.print(this.RT.root, options)
  }
}

interface BaseNodeInstruction {
  protocol: string
}

interface GenericNodeInstruction extends BaseNodeInstruction {
  protocol: `process-child` | `elementary-algebra` | `pass`
}

interface GetValueNodeInstruction extends BaseNodeInstruction {
  protocol: `get-value`
  type: `string` | `number` | `boolean` | `any`
  asIdentifier?: boolean
}

interface TypeNodeInstruction extends BaseNodeInstruction {
  protocol: `normalize`
  type: Type
}

type NodeInstruction = GenericNodeInstruction | GetValueNodeInstruction | TypeNodeInstruction

type TNodeInstructionFactory<TInstruction extends NodeInstruction = NodeInstruction> = (...args: any[]) => TInstruction

const PASS: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `pass` })
const GET_VALUE: TNodeInstructionFactory<GetValueNodeInstruction> = (type: GetValueNodeInstruction[`type`], asIdentifier) => ({ protocol: `get-value`, type, asIdentifier })
const PROCESS_CHILD: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `process-child` })
const ELEMENTARY_ALGEBRA: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `elementary-algebra` })
const NORMALIZE: TNodeInstructionFactory<TypeNodeInstruction> = type => ({ protocol: `normalize`, type })
