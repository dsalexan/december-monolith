import { filter, isNil, range, reverse } from "lodash"
import churchill, { Block, paint, Paint } from "../../logger"

import Type, { isOperand } from "../../type/base"
import Grammar from "../../type/grammar"
import assert from "assert"
import { PrintOptions } from "../../tree/printer"
import Tree from "../../tree"
import { NIL, STRING_COLLECTION } from "../../type/declarations/literal"
import Node from "../../node"
import { OriginalChildrenTracking, ReorganizationStatus } from "../../type/rules/semantical"
import { postOrder } from "../../node/traversal"

import { NodeReplacementSystem } from "../../nrs"
import { KEEP_NODE, REMOVE_NODE } from "../../nrs/system"

import type { BaseProcessingOptions } from "../../options"
import SymbolTable from "../../environment/symbolTable"

export { default as NRS } from "./nrs"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface BaseSemanticOptions {}

export type SemanticOptions = BaseSemanticOptions & BaseProcessingOptions

export default class Semantic {
  public options: SemanticOptions
  //
  public grammar: Grammar
  // tokenized expression -> AT
  private expression: string
  private AST: Tree
  public ST: Tree
  //
  private nodeReplacementSystem: NodeReplacementSystem
  //

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<SemanticOptions>) {
    this.options = {
      logger: options.logger ?? _logger,
      scope: options.scope!,
    }

    return this.options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(expression: string, AST: Tree, nodeReplacementSystem: NodeReplacementSystem, options: Partial<SemanticOptions> = {}) {
    this._options(options) // default options

    this.expression = expression
    this.AST = AST

    this.nodeReplacementSystem = nodeReplacementSystem

    this._process()

    return this.ST
  }

  _processAbstractSyntaxTree(AST: Tree) {
    const MAX_STACK_OVERFLOW = this.nodeReplacementSystem.ruleset.length * 10 + 100

    const tree = AST.clone()

    // post order so we change children before parents
    const order: Node[] = []
    postOrder(tree.root, node => order.push(node))
    for (const node of order) {
      global.__DEBUG_LABEL = node.name // COMMENT

      let loopAgain = false
      let i = 0
      do {
        node._preCalculatedScope = node.scope(this.options.scope)

        // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

        const newNode = this.nodeReplacementSystem.exec(node)

        loopAgain = false
        if (newNode === KEEP_NODE) {
          // do nothing
        } else if (newNode === REMOVE_NODE) tree.remove(node)
        else if (newNode instanceof Node) tree.replaceWith(node, newNode)
        else if (newNode.type === `REPLACE_NODES_AT`) {
          for (const index of reverse(newNode.indexes)) node._removeChildAt(index, true)
          tree.addTo(node, newNode.node, newNode.indexes[0])

          // nodes were replaced at lower levels, so we need to reprocess this node
          loopAgain = true
        } else if (newNode.type === `ADD_NODE_AT`) {
          tree.addTo(node, newNode.node, newNode.index)

          // nodes were replaced at lower levels, so we need to reprocess this node
          loopAgain = true
        } else throw new Error(`Invalid node replacement action`)

        i++
        if (i > MAX_STACK_OVERFLOW) throw new Error(`Stack overflow`)
      } while (loopAgain)
    }

    return tree
  }

  private _processAbstractTree_old(AST: Tree) {
    const tree = AST.clone()

    // post order so we change children before parents
    const order: Node[] = []
    postOrder(tree.root, node => order.push(node))
    for (const node of order) {
      node._preCalculatedScope = node.scope(this.options.scope)

      const newNode = this.nodeReplacementSystem.exec(node)

      if (newNode === KEEP_NODE) {
        // do nothing
      } else if (newNode === REMOVE_NODE) tree.remove(node)
      else if (newNode instanceof Node) tree.replaceWith(node, newNode)
      else throw new Error(`Invalid node replacement action`)
    }

    return tree
  }

  /** Reorganize nodes in a pre-stablished Semantic Tree */
  _reorganizeSemanticTree(ST: Tree) {
    // this function exists for when a lookbehind is not enough

    const queue = [ST.root]

    // replicate AST into ST
    while (queue.length) {
      const parent = queue.shift()! // we always reorganize a node's children (but never the node itself)
      const tracking = new OriginalChildrenTracking(parent.children)

      if (!parent.attributes.reorganized) {
        let children: Node[] = [...parent.children]
        let matches: ReturnType<Grammar[`matchSemantical`]> = []

        // 1. Try to match with every semantical type (sorted by priority)
        while ((matches = this.grammar.matchSemantical(parent, children)).length) {
          // 2. Highest priority match is allowed to reorganize children
          const { type, result } = matches[0]

          assert(type.semantical?.reorganize, `Type lacks semantical (or semantical reorganize function)`)
          const { reorganize } = type.semantical!

          // (status is updated inside reorganize)
          const reorganized = reorganize!(parent, children, result, tracking)

          // 3. update children buffer (some reorganized can end up not changing any child)
          if (reorganized) children = reorganized

          // 3. Repeat until there are no matches
        }

        // ERROR: No child is changed OR all children are accounted for
        if (!tracking.validate()) debugger

        // if there was some change, reset parent children and add new ones
        if (tracking.doUpdateChildren()) {
          parent.removeAllChildren()
          for (const child of children) parent._addChild(child)
        }

        // inform node was already reorganized
        parent.setAttributes({ reorganized: true })
      }

      // queue children to reorganize
      for (const child of parent.children) queue.push(child)
    }
  }

  /**  */
  _processAbstractSyntaxTree_other(AST: Tree) {
    const tree = AST.clone()

    // post order so we analyse the three from the bottom up
    postOrder(tree.root, parent => {
      // we always reorganize a node's children (but never the node itself)
      //    leaves needs not to be reorganized

      // if parent already had its children reorganized, skip
      if (parent.attributes.reorganized) return

      const tracking = new OriginalChildrenTracking(parent.children)

      let children: Node[] = [...parent.children]
      let matches: ReturnType<Grammar[`matchSemantical`]> = []

      // 1. Try to match with every semantical type (sorted by priority)

      // ERROR: No child is changed OR all children are accounted for
      if (!tracking.validate()) debugger

      // if there was some change, reset parent children and add new ones
      if (tracking.doUpdateChildren()) {
        parent.removeAllChildren()
        for (const child of children) parent._addChild(child)
      }

      // inform node was already reorganized
      parent.setAttributes({ reorganized: true })
    })

    return tree
  }

  /** Process tokenized expression into an AST */
  private _process() {
    // TODO: Weave NRS and reorganization together. There is a edge case where I need FUNCTION first then the list collapsing
    // this.ST = this._processAbstractTree(this.AST)
    // this._reorganizeSemanticTree(this.ST)

    this.ST = this._processAbstractSyntaxTree(this.AST)

    // TODO: Validate AST
    // TODO: Print errors found in AST
  }

  print(options: PrintOptions = {}) {
    const logger = _logger

    // 1. Print expression
    console.log(` `)
    logger.add(paint.gray(range(0, this.expression.length).join(` `))).info()
    logger.add(paint.gray([...this.expression].join(` `))).info()
    console.log(` `)

    // 2. Print Abstract Tree
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`SEMANTIC TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    this.ST.print(this.ST.root, options)

    // 3. Build and print Symbol Table
    const symbolTable = SymbolTable.from(this.ST, this.options.scope)
    symbolTable.print()
  }
}
