import { filter, isNil, range, reverse } from "lodash"
import churchill, { Block, paint, Paint } from "../../logger"

import Grammar from "../../type/grammar"
import assert from "assert"
import { NIL, STRING_COLLECTION } from "../../type/declarations/literal"
import Node, { PrintOptions, print, SubTree } from "../../node"
import { postOrder } from "../../node/traversal"

import { RuleSet, NodeReplacementSystem } from "../../nrs"

import type { BaseProcessingOptions } from "../../options"
import SymbolTable from "../../environment/symbolTable"
import { evaluateTreeScope } from "../../node/scope"

export { RULESET_SEMANTIC } from "./nrs"

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
  private rulesets: RuleSet[]
  //
  private NRS: NodeReplacementSystem

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<SemanticOptions>) {
    this.options = {
      logger: options.logger ?? _logger,
      debug: options.debug ?? false,
      scope: options.scope!,
    }

    return this.options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(AST: SubTree, rulesets: RuleSet[], options: Partial<SemanticOptions> = {}) {
    this._options(options) // default options

    this.AST = AST

    this.rulesets = [...rulesets]
    for (const ruleset of this.grammar.getRuleSets()) this.rulesets.push(ruleset)

    this._process()

    return this.ST
  }

  _processAbstractSyntaxTree(AST: SubTree) {
    const MAX_STACK_OVERFLOW = this.rulesets.length * 10 + 100

    this.NRS = new NodeReplacementSystem()
    this.NRS.setRulesets(this.rulesets)

    const tree = AST.clone()
    evaluateTreeScope(tree, { master: this.options.scope })

    this.NRS.process(tree.root, {
      scope: this.options.scope,
      grammar: this.grammar,
      //
      tag: `semantic`,
      run: 1,
    })

    tree.root.refreshIndexing()
    tree.expression()
    evaluateTreeScope(tree, { master: this.options.scope })

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

    this.NRS.print(`semantic`)

    // 2. Build and print Symbol Table
    const symbolTable = SymbolTable.from(this.ST, this.options.scope)
    symbolTable.print()
  }
}
