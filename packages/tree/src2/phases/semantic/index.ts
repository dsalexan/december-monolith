import { filter, isNil, range, reverse } from "lodash"
import churchill, { Block, paint, Paint } from "../../logger"

import Grammar from "../../type/grammar"
import assert from "assert"
import { NIL, STRING_COLLECTION } from "../../type/declarations/literal"
import Node, { PrintOptions, print, SubTree } from "../../node"
import { postOrder } from "../../node/traversal"

import { exec, RuleSet } from "../../nrs"
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
  private AST: SubTree
  public ST: SubTree
  //
  private NRS: RuleSet[]
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
  process(AST: SubTree, NRS: RuleSet[], options: Partial<SemanticOptions> = {}) {
    this._options(options) // default options

    this.AST = AST

    this.NRS = [...NRS]
    for (const ruleset of this.grammar.getRuleSets()) this.NRS.push(ruleset)

    this._process()

    return this.ST
  }

  _processAbstractSyntaxTree(AST: SubTree) {
    const MAX_STACK_OVERFLOW = this.NRS.length * 10 + 100

    const tree = AST.clone()

    // post order so we change children before parents
    const order: Node[] = []
    postOrder(tree.root, node => order.push(node))
    for (const node of order) {
      global.__DEBUG_LABEL = node.name // COMMENT

      let loopAgain = false
      let i = 0
      do {
        node.scope = this.options.scope.evaluate(node)

        // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

        const newNode = exec(this.NRS, node, { grammar: this.grammar })

        loopAgain = false
        if (newNode === KEEP_NODE) {
          // do nothing
        } else if (newNode === REMOVE_NODE) node.parent!.children.remove(node)
        else if (newNode instanceof Node) node.syntactical.replaceWith(newNode)
        else if (newNode.type === `REPLACE_NODES_AT`) {
          for (const index of reverse(newNode.indexes)) node.children.remove(index, { refreshIndexing: false })
          node.syntactical.addNode(newNode.node, newNode.indexes[0])

          // nodes were replaced at lower levels, so we need to reprocess this node
          loopAgain = true
        } else if (newNode.type === `ADD_NODE_AT`) {
          node.syntactical.addNode(newNode.node, newNode.index)

          // nodes were replaced at lower levels, so we need to reprocess this node
          loopAgain = true
        } else throw new Error(`Invalid node replacement action`)

        i++
        if (i > MAX_STACK_OVERFLOW) throw new Error(`Stack overflow`)
      } while (loopAgain)
    }

    return tree
  }

  /** Process tokenized expression into an AST */
  private _process() {
    this.ST = this._processAbstractSyntaxTree(this.AST)

    // TODO: Validate AST
    // TODO: Print errors found in AST
  }

  print(options: PrintOptions) {
    const logger = _logger

    // 1. Print Abstract Tree
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`SEMANTIC TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    print(this.ST.root, options)

    // 2. Build and print Symbol Table
    const symbolTable = SymbolTable.from(this.ST, this.options.scope)
    symbolTable.print()
  }
}
