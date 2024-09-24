import { APPLY_ARGUMENTS, ELEMENTARY_ALGEBRA, GET_VALUE, NodeInstruction, NORMALIZE, PASS, PROCESS_CHILD } from "./instruction"
import assert from "assert"
import { filter, isBoolean, isFunction, isNil, isNumber, isString, range } from "lodash"

import { Interval, Point, Range, typing } from "@december/utils"
import { Primitive } from "@december/utils/typing"

import churchill, { Block, paint, Paint } from "../../logger"

import Node, { PrintOptions, print, SubTree } from "../../node"

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
import { getType } from "../../type"
import { ProcessedNode } from "../../type/rules/reducer"
import { TypeName } from "../../type/declarations/name"

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

export interface BaseReducerOptions {
  ignoreTypes?: TypeName[]
}

export type ReducerOptions = BaseReducerOptions & BaseProcessingOptions

export default class Reducer {
  public options: ReducerOptions
  public grammar: Grammar
  //
  private symbolTable: SymbolTable
  private environment: Environment
  private T: SubTree
  public RT: SubTree
  //

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<ReducerOptions>) {
    this.options = {
      logger: options.logger ?? _logger,
      debug: options.debug ?? false,
      scope: options.scope!,
      ignoreTypes: options.ignoreTypes ?? [],
    }

    return this.options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(tree: SubTree, environment: Environment, options: Partial<ReducerOptions> = {}) {
    this._options(options) // default options

    this.T = tree
    this.environment = environment

    this._process()

    return this.RT
  }

  /** Process Node into some value */
  _processNode(node: Node): ProcessedNode {
    assert(node, `Node must be defined`)

    const scope = this.options.scope.evaluate(node)
    const master = getMasterScope(scope)

    const instruction = this._getNodeInstruction(node, { master, all: scope })

    // if (node.content === `X`) debugger

    return this._processNodeInstruction(instruction, node, { master, all: scope })
  }

  /** Get instruction for node processing based on scope */
  _getNodeInstruction(node: Node, { master, all: scope }: { master: MasterScope; all: Scope[] }): NodeInstruction {
    if (node.type.reduce?.getNodeInstruction) return node.type.reduce?.getNodeInstruction.call(this, node, { master, all: scope })
    else if (node.type.name === `root`) {
      assert(node.children.length === 1, `Root node must have exactly one child`) // confirm uarity

      return PROCESS_CHILD()
    } else if (node.type.id === `identifier`) {
      const identifier = node.content!

      const isSymbol = this.symbolTable.has(identifier)

      assert(isSymbol, `Identifier "${node.content}" is not defined in Symbol Table`)

      return this.environment.has(identifier) ? GET_VALUE(`any`) : PASS()
    } else if (node.type.id === `literal`) {
      // TODO: Implement literality function in Environment

      if (master !== `math`) debugger

      if (node.type.name === `number`) return GET_VALUE(`number`)
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
    } else if (node.type.name === `function`) return APPLY_ARGUMENTS(1)
    else if (node.type.id === `enclosure`) {
      if (master !== `math`) throw new Error(`Unimplemented NON-MATH enclosure type "${node.type.name}"`)

      if (node.type.modules.includes(`wrapper`)) {
        if (node.children.length === 1) return PROCESS_CHILD()
        else debugger
      } else debugger
    } else if (node.type.name === `keyword_group`) {
      // TODO: Implement this
      if (node.children.length > 1) debugger

      return PROCESS_CHILD()
    }

    throw new Error(`Unimplemented processing for node type "${node.type.getFullName()}"`)
  }

  /** Effectivelly process node + instruction */
  _processNodeInstruction(instruction: NodeInstruction, node: Node, { master, all: scope }: { master: MasterScope; all: Scope[] }): ProcessedNode {
    const dontReduce = this.options.ignoreTypes?.includes(node.type.name)

    if (instruction.protocol === `pass`) return node
    else if (instruction.protocol === `process-child`) return this._processNode(node.children.nodes[0])
    else if (instruction.protocol === `normalize`) {
      node.setType(instruction.type) // change node type

      // flat all its children into a string
      const content = node.content!
      const token = new Token({ type: `concrete`, value: content }, instruction.type)

      node.clearTokens()
      node.addToken(token)

      return node
    } else if (instruction.protocol === `get-value`) {
      // get type accurate value from node

      let stringValue = node.content! as string

      const asIdentifier = instruction.asIdentifier ?? node.type.id === `identifier`

      if (asIdentifier) {
        const identifier = stringValue
        assert(this.environment.has(identifier), `Identifier "${identifier}" is not defined in Environment`)

        stringValue = this.environment.get(identifier).getValue()
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
      if (node.type.name !== `sign`) assert(node.type.syntactical!.arity === 2, `Elementary algebra requires two operands`)

      const { arity } = node.type.syntactical!
      assert(arity === node.children.length, `Elementary algebra "${node.type.name}" requires ${arity} operands`)

      const _children = node.children.nodes.map(child => this._processNode(child))

      // if we could not process all nodes, wrap everything in nodes to return
      if (_children.some(child => child instanceof Node)) return wrapProcessedChildren(node, _children)

      let [left, right] = _children as number[]

      // TODO: Probably check if both operands are of the same type???

      // arithmetic operations
      if (node.type.name === `sign`) {
        assert(left, `Sign operation requires one operand`)
        const sign = node.lexeme === `-` ? -1 : 1
        return left * sign
      } else if (node.type.name === `addition`) return left + right
      else if (node.type.name === `subtraction`) return left - right
      else if (node.type.name === `multiplication`) return left * right
      else if (node.type.name === `division`) return left / right
      // logical operations
      if (node.type.name === `equals`) return left === right
      else if (node.type.name === `greater`) return left > right
      else if (node.type.name === `smaller`) return left < right
      else if (node.type.name === `greater_or_equal`) return left >= right
      else if (node.type.name === `smaller_or_equal`) return left <= right
      //
      else throw new Error(`Unimplemented elementary algebra operation "${node.type.name}"`)
    } else if (instruction.protocol === `apply-arguments`) {
      const _name = node.children.nodes[0]
      const _arguments = node.children.nodes.slice(1)

      const fn = this._processNode(_name) as Node | Function
      const listOfArguments = _arguments.map((arg, i) => this._processNode(arg))

      // if we could not process all nodes, wrap everything in nodes to return
      if (fn instanceof Node || listOfArguments.some(arg => arg instanceof Node)) {
        // no need to reprocess function name (fn)

        return wrapProcessedChildren(node, listOfArguments, 1)
      }

      assert(isFunction(fn), `identifier "${_name.content}" is not pointing to a function in ENVIRONMENT`)

      if (listOfArguments.some(arg => arg instanceof Node)) {
        // TODO: How to handle when arguments are not yet processed?
        debugger
      } else {
        const value = fn(...listOfArguments)

        debugger
        return value
      }
    } else if (instruction.protocol === `custom`) {
      const { processNodeInstruction } = node.type.reduce!
      assert(processNodeInstruction, `Missing custom node reduce process`)

      return processNodeInstruction.call(this, instruction, node, { master, all: scope })
    }

    throw new Error(`Unimplemented processing protocol "${instruction.protocol}"`)
  }

  /** Process tree with data from environment */
  private _process() {
    this.symbolTable = SymbolTable.from(this.T, this.options.scope)
    const result = this._processNode(this.T.root)

    // encapsulate processed return into a tree
    const root = Node.ROOT(Range.fromLength(0, 1))
    const tree = new SubTree(root)

    if (result instanceof Node) {
      tree.root.children.add(result)
    } else if (isString(result) || isNumber(result) || isBoolean(result)) {
      const type = getType(typing.guessType(result)!)
      const literal = Node.fromToken(result.toString(), type)

      tree.root.children.add(literal)
    } else throw new Error(`Unimplemented result treatment`)

    // verify expression (and recalculate if necessary)
    tree.expression(true)

    this.RT = tree
  }

  print(options: PrintOptions) {
    const logger = _logger

    // 1. Print  Tree
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`REDUCED TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    print(this.RT.root, options)
  }
}

function wrapProcessedChildren(parent: Node, children: ProcessedNode[], i0 = 0) {
  for (const [i, _child] of children.entries()) {
    if (!(_child instanceof Node)) {
      const type = getType(typing.getType(_child)!)
      const child = Node.fromToken(_child.toString(), type)
      parent.syntactical.replaceAt(i0 + i, child)
    }
  }

  return parent
}
