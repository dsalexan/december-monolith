import { APPLY_ARGUMENTS, ELEMENTARY_ALGEBRA, GET_VALUE, NodeInstruction, NORMALIZE, PASS, PROCESS_CHILD } from "./instruction"
import assert from "assert"
import { filter, isBoolean, isFunction, isNil, isNumber, isString, range, uniq } from "lodash"

import { Interval, Point, Range, typing } from "@december/utils"
import { IUnit, Quantity } from "@december/utils/unit"
import { Primitive } from "@december/utils/typing"

import churchill, { Block, paint, Paint } from "../../logger"

import Node, { PrintOptions, print, SubTree, NodeFactory } from "../../node"

import type { BaseProcessingOptions } from "../../options"

import { postOrder } from "../../node/traversal"
import { evaluateTreeScope, MasterScope, Scope } from "../../node/scope"
import { BOOLEAN, NUMBER, QUANTITY, STRING } from "../../type/declarations/literal"
import Token, { NON_EVALUATED_LEXICAL_TOKEN } from "../../token"
import Grammar from "../../type/grammar"
import SymbolTable from "../../environment/symbolTable"
import { IDENTIFIER } from "../../type/declarations/identifier"
import Type from "../../type/base"
import { getType } from "../../type"
import { ProcessedNode } from "../../type/rules/reducer"
import { TypeName } from "../../type/declarations/name"
import { Arguments } from "tsdef"
import Environment from "../../environment"
// import { Operation, Operand, doAlgebra, OPERATIONS } from "./algebra"

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

    const scope = node.getScope()

    const instruction = this._getNodeInstruction(node, { master: this.options.scope, all: scope })

    // if (node.content === `X`) debugger

    return this._processNodeInstruction(instruction, node, { master: this.options.scope, all: scope })
  }

  /** Get instruction for node processing based on scope */
  _getNodeInstruction(node: Node, { master, all: scope }: { master: MasterScope; all: Scope[] }): NodeInstruction {
    if (node.type.reduce?.getNodeInstruction) return node.type.reduce?.getNodeInstruction.call(this, node, { master, all: scope })
    else if (node.type.name === `root`) {
      assert(node.children.length === 1, `Root node must have exactly one child`) // confirm uarity

      return PROCESS_CHILD()
    } else if (node.type.id === `identifier`) {
      // A. Get symbol for content
      const content = node.content!
      const [symbol] = this.symbolTable.get(content, `content`).flat()
      assert(symbol, `Identifier "${node.content}" is not defined in Symbol Table`)

      // B. Check environment by symbol's values (a "cleaner" version of content, following some pre-defined rules)
      const key = symbol.key
      return this.environment.has(key) ? GET_VALUE(`any`) : PASS()
    } else if (node.type.id === `literal`) {
      // TODO: Implement literality function in Environment

      if (master !== `math-enabled`) debugger

      if (node.type.name === `number`) return GET_VALUE(`number`)
      else if (node.type.name === `quantity`) return GET_VALUE(`quantity`)
      else if (node.type.name === `string` || node.type.name === `string_collection`) {
        // A. Get symbol for content
        const content = node.content!
        const [symbol] = this.symbolTable.get(content, `content`).flat()

        // if node is a symbol
        if (symbol) {
          // B. Check environment by symbol's values (a "cleaner" version of content, following some pre-defined rules)

          // first try to get value from Environment
          //    if it is not in Environment, transform it into a identifier

          const key = symbol.key
          return this.environment.has(key) ? GET_VALUE(`any`, true) : NORMALIZE(IDENTIFIER)
        }

        debugger
      } else throw new Error(`Unimplemented literal type "${node.type.name}"`)
      //
    } else if (node.type.id === `operator`) {
      if (master !== `math-enabled`) throw new Error(`Unimplemented NON-MATH operator type "${node.type.name}"`)

      if (node.type.modules.includes(`arithmetic`)) return ELEMENTARY_ALGEBRA()
      else if (node.type.modules.includes(`logical`)) return ELEMENTARY_ALGEBRA()
    } else if (node.type.name === `function`) return APPLY_ARGUMENTS(1)
    else if (node.type.id === `enclosure`) {
      if (master !== `math-enabled`) throw new Error(`Unimplemented NON-MATH enclosure type "${node.type.name}"`)

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
        const symbol = SymbolTable.symbolFromNode(node, master)!
        const key = symbol.key
        assert(this.environment.has(key), `Identifier "${key}" is not defined in Environment`)

        const _value = this.environment.get(key).getValue.call(this.environment, symbol, node)
        if (Environment.isResolved(_value)) stringValue = _value
      }

      if (instruction.type === `any`) return stringValue
      else if (instruction.type === `string`) return stringValue
      else if (instruction.type === `number`) {
        const numericValue: number = parseFloat(stringValue)

        assert(!isNaN(numericValue), `Invalid number value conversion "${stringValue}" -> "${numericValue}"`)

        return numericValue
      } else if (instruction.type === `boolean`) return stringValue.toLowerCase() === `true` || stringValue === `1` ? true : false
      else if (instruction.type === `quantity`) {
        const value = this._processNode(node.children.nodes[0])
        if (value instanceof Node) return node

        const unit = node.attributes.unit as IUnit
        assert(isNumber(value), `Only tested for numbers`)

        const quantity = unit.toQuantity(value)

        const symbol = unit.getSymbol()
        const isIdentified = this.environment.has(symbol)
        if (isIdentified) {
          const value = this.environment.get(symbol).getValue.call(this.environment, quantity, node)
          if (!Environment.isResolved(value)) return value // probably gon be used for unit conversions
        }

        return quantity
      }
      //
    } else if (instruction.protocol === `elementary-algebra`) {
      if (node.type.name !== `sign`) assert(node.type.syntactical!.arity === 2, `Elementary algebra requires two operands`)

      const { arity } = node.type.syntactical!
      assert(arity === node.children.length, `Elementary algebra "${node.type.name}" requires ${arity} operands`)

      const __children = node.children.nodes.length
      const _children = node.children.nodes.map(child => this._processNode(child))

      assert(_children.length === __children, `Not all children were processed`)

      const _sameAlgebraicType = _children.map(child => {
        if (child instanceof Node) return `node`
        else if (child instanceof Quantity) {
          const quantity = child as Quantity
          return `quantity:${quantity.unit.getSymbol()}`
        } else return typing.guessType(child)
      })
      const sameAlgebraicType = uniq(_sameAlgebraicType)

      const differentTypes = sameAlgebraicType.length > 1

      // if we could not process all nodes, wrap everything in nodes to return
      if (differentTypes || _children.some(child => child instanceof Node)) return wrapProcessedChildren(node, _children)

      let [left, right] = _children as number[]

      if (node.type.name === `sign`) {
        assert(left, `Sign operation requires one operand`)
        const sign = node.lexeme === `-` ? -1 : 1
        return sign * left
      }
      // arithmetic operations
      if (node.type.name === `addition`) return left + right
      else if (node.type.name === `subtraction`) return left - right
      else if (node.type.name === `multiplication`) return left * right
      else if (node.type.name === `division`) return left / right
      // logical operations
      else if (node.type.name === `and`) return left && right
      else if (node.type.name === `or`) return left || right
      //    inequality
      else if (node.type.name === `equals`) return left === right
      else if (node.type.name === `greater`) return left > right
      else if (node.type.name === `smaller`) return left < right
      else if (node.type.name === `greater_or_equal`) return left >= right
      else if (node.type.name === `smaller_or_equal`) return left <= right
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
    const root = NodeFactory.abstract.ROOT(Range.fromLength(0, 1))
    const tree = new SubTree(root)

    const node = result instanceof Node ? result : NodeFactory.abstract.makeByGuess(result)
    tree.root.children.add(node)

    // verify expression (and recalculate if necessary)
    tree.root.refreshIndexing()
    tree.expression(true)
    evaluateTreeScope(tree, { master: this.options.scope })

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
  for (const [i, child] of children.entries()) {
    const node = child instanceof Node ? child : NodeFactory.abstract.makeByGuess(child)
    parent.syntactical.replaceAt(i0 + i, node)
  }

  return parent
}

function wrapProcessedChildren_REFACTOR_THIS_SHIT(parent: Node, children: ProcessedNode[], i0 = 0) {
  for (const [i, _child] of children.entries()) {
    if (!(_child instanceof Node)) {
      let variableType = typing.getType(_child)! as Arguments<typeof getType>[0]
      if (_child instanceof Quantity) variableType = `quantity`

      const type = getType(variableType)
      const child = NodeFactory.abstract.make(_child.toString(), type)
      parent.syntactical.replaceAt(i0 + i, child)

      if (type.name === `quantity`) {
        const unitOfMeasurement: IUnit = _child as any

        child.tokens[0].setAttributes({ traversalIndex: -1, value: unitOfMeasurement })
        child.setAttributes({ reorganized: true, unit: unitOfMeasurement })
      }

      for (const token of child.tokens) {
        assert(!token.isNonEvaluated, `Token must be evaluated`)
      }
    } else {
      // for (const token of _child.tokens) {
      //   assert(!token.isNonEvaluated, `Token must be evaluated`)
      // }
    }
  }

  return parent
}
