import { filter, isNil, range } from "lodash"
import { Interval, Point, Range } from "@december/utils"

import churchill, { Block, paint, Paint } from "../../logger"

import Type, { isOperand } from "../../type/base"
import Grammar from "../../type/grammar"
import assert from "assert"
import { PrintOptions } from "../../tree/printer"
import Tree from "../../tree"
import { STRING_COLLECTION } from "../../type/declarations/literal"
import Node from "../../node"
import { OriginalChildrenTracking, ReorganizationStatus } from "../../type/rules/semantical"
import SymbolTable from "../semantic/symbolTable"
import { inOrder, postOrder } from "../../node/traversal"

import { NodeReplacementSystem } from "../../nrs"
import { KEEP_NODE, REMOVE_NODE } from "../../nrs/system"

import type { BaseProcessingOptions } from "../../options"

export { default as NRS } from "./nrs"

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

export interface BaseSimplifyOptions {}

export type SimplifyOptions = BaseSimplifyOptions & BaseProcessingOptions

export default class Simplify {
  public options: Partial<SimplifyOptions>
  //
  public grammar: Grammar
  // Semantic Tree + environment -> Simplified Semantic Tree
  private originalExpression: string
  private ST: Tree
  private symbolTable: SymbolTable
  private environment: unknown
  private SST: Tree
  //
  private nodeReplacementSystem: NodeReplacementSystem
  //

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<SimplifyOptions>) {
    return options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(expression: string, ST: Tree, symbolTable: SymbolTable, environment: unknown, nodeReplacementSystem: NodeReplacementSystem, options: Partial<SimplifyOptions> = {}) {
    this._options(options) // default options

    this.originalExpression = expression
    this.ST = ST
    this.symbolTable = symbolTable
    this.environment = environment

    this.nodeReplacementSystem = nodeReplacementSystem

    this._process()

    return this.ST
  }

  /** Simplify Semantic Tree based on environment */
  private _simplifySemanticTree(ST: Tree, symbolTable: SymbolTable, environment: unknown) {
    const __DEBUG = true // COMMENT

    const tree = ST.clone()

    // post order so we change children before parents
    const order: Node[] = []
    postOrder(tree.root, node => order.push(node))
    for (const node of order) {
      node.tree = tree
      const newNode = this.nodeReplacementSystem.exec(node)

      if (newNode === KEEP_NODE) {
        // do nothing
      } else if (newNode === REMOVE_NODE) {
        debugger
      } else if (newNode instanceof Node) tree.replaceWith(node, newNode)
      else throw new Error(`Invalid node replacement action`)
    }

    // tree.root.debug()

    // TODO: Improve this method to recalculate ranges
    let modifiedExpression = ``

    // recalculate ranges and final expression
    let cursor = 0
    inOrder(tree.root, (node, token, ignorable) => {
      if (ignorable) debugger

      if (node._range) debugger

      if (!token) {
        debugger
      } else {
        const length = token.interval.length
        modifiedExpression += token.lexeme

        assert(length === token.lexeme.length, `Length mismatch`)

        token.updateInterval(Interval.fromLength(cursor, length))
        cursor += length
      }
    })

    // update local expression for all tokens
    tree.root._range = Range.fromLength(0, modifiedExpression.length).addEntry(new Point(0)).addEntry(new Point(modifiedExpression.length))
    tree.expression = modifiedExpression
    postOrder(tree.root, node => node.tokens.map(token => token.updateExpression(modifiedExpression)))

    // tree.root.debug()

    return tree
  }

  /** Process tokenized expression into an AST */
  private _process() {
    this.SST = this._simplifySemanticTree(this.ST, this.symbolTable, this.environment)
  }

  print(options: PrintOptions = {}) {
    const logger = _logger

    // 1. Print expression
    console.log(` `)
    logger.add(paint.gray(range(0, this.originalExpression.length).join(` `))).info()
    logger.add(paint.gray([...this.originalExpression].join(` `))).info()
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
      .add(paint.grey(`SIMPLIFIED SEMANTIC TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    this.SST.print(this.SST.root, options)
  }
}
