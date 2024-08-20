import { filter, isNil, range } from "lodash"
import churchill, { Block, paint, Paint } from "../../logger"
import SymbolTable from "./symbolTable"

import Type, { isOperand } from "../../type/base"
import Grammar from "../../type/grammar"
import assert from "assert"
import { PrintOptions } from "../../tree/printer"
import Tree from "../../tree"
import { NIL, STRING_COLLECTION } from "../../type/declarations/literal"
import Node from "../../node"
import { OriginalChildrenTracking, ReorganizationStatus } from "../../type/rules/semantical"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface SemanticOptions {
  logger?: typeof _logger
}

export default class Semantic {
  public options: Partial<SemanticOptions>
  //
  public grammar: Grammar
  // tokenized expression -> AT
  private expression: string
  private AST: Tree
  public ST: Tree
  public symbolTable: SymbolTable
  //

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<SemanticOptions>) {
    return options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(expression: string, AST: Tree, options: Partial<SemanticOptions> = {}) {
    this._options(options) // default options

    this.expression = expression
    this.AST = AST

    this._process()

    return this.ST
  }

  /** Transfer nodes from a AST into a ST */
  private _parseSemanticTree(AST: Tree) {
    const __DEBUG = true // COMMENT

    const tree = new Tree(this.expression, AST.root.clone())

    const queue = [AST.root]

    // replicate AST into ST
    while (queue.length) {
      const ATParent = queue.shift()!

      const parent = tree.root.find(node => node.id === ATParent.id)!

      assert(parent, `Parent node not found`)

      // insert node at ST
      for (const ATNode of ATParent.children) {
        let QUEUE_CHILDREN = true

        let node = ATNode.clone()
        node.setAttributes({
          ...(node.attributes ?? {}),
          originalNodes: [ATNode],
        })

        const scope = ATNode.scope(node => {
          if (node.type.name === `quotes`) return [`string`]
          if (node.type.name === `string`) return [`string`]

          return []
        })

        // A. ignore whitespaces in non-string context
        if (node.type.name === `whitespace` && !scope.includes(`string`)) continue

        // B. collapse no/single child list
        if (node.type.name === `list` && node.children.length <= 1) {
          node.attributes.originalNodes = [ATNode, ...ATNode.children]

          const child = node.children[0]

          node.setType(!child ? NIL : child.type) // collapse list into child type

          assert(node.tokens.length === 0, `List should not have tokens`)
          if (child) node.addToken(child.tokens) // transplant tokens to old list
        }

        // C. collapse quotes into a string
        if (node.type.name === `quotes`) {
          QUEUE_CHILDREN = false

          const tokenized = ATNode.tokenize()
          const tokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))

          node.setType(STRING_COLLECTION)

          node.clearTokens()
          node.addToken(tokens.slice(1, -1), 1)
        }

        parent._addChild(node)

        if (QUEUE_CHILDREN) queue.push(ATNode) // enqueue child
      }
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

  /** Process tokenized expression into an AST */
  private _process() {
    this.ST = this._parseSemanticTree(this.AST)
    this._reorganizeSemanticTree(this.ST)

    // TODO: Validate AST
    // TODO: Print errors found in AST
    // TODO: Build symbol table

    this.symbolTable = SymbolTable.from(this.ST)
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

    // 3. Print symbol table
    console.log(`\n`)
    this.symbolTable.print()
  }
}
