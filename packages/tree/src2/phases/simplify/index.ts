import { filter, isNil, range } from "lodash"
import assert from "assert"

import { Interval, Point, Range } from "@december/utils"

import churchill, { Block, paint, Paint } from "../../logger"

import Type from "../../type/base"
import Grammar from "../../type/grammar"
import { STRING_COLLECTION } from "../../type/declarations/literal"
import Node, { PrintOptions, print, SubTree } from "../../node"

import { defaultInOrderBehaviour, inOrder, postOrder, preOrder } from "../../node/traversal"

import { RuleSet, NodeReplacementSystem } from "../../nrs"

import type { BaseProcessingOptions } from "../../options"
import Environment from "../../environment"
import { evaluateTreeScope } from "../../node/scope"

export { RULESETS_SIMPLIFY } from "./nrs"

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

export interface BaseSimplifyOptions {
  rulesets?: RuleSet[]
}

export type SimplifyOptions = BaseSimplifyOptions & BaseProcessingOptions

export default class Simplify {
  public options: SimplifyOptions
  //
  public grammar: Grammar
  // Semantic Tree + environment -> Simplified Semantic Tree
  // private originalExpression: string
  private ST: SubTree
  private environment: Environment
  public SST: SubTree
  //
  private rulesets: RuleSet[]
  //
  private NRS: NodeReplacementSystem

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<SimplifyOptions>) {
    this.options = {
      logger: options.logger ?? _logger,
      debug: options.debug ?? false,
      scope: options.scope!,
      rulesets: options.rulesets ?? [],
    }

    return this.options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(ST: SubTree, environment: Environment, rulesets: RuleSet[], options: Partial<SimplifyOptions> = {}) {
    this._options(options) // default options

    this.ST = ST
    this.environment = environment

    this.rulesets = [...(this.options.rulesets ?? []), ...rulesets]

    assert(this.rulesets.length > 0, `No rulesets provided for simplification`)

    this._process()

    return this.ST
  }

  /** Simplify Semantic Tree based on environment */
  private _simplifySemanticTree(ST: SubTree, environment: Environment) {
    let __DEBUG = false // COMMENT
    // __DEBUG = global.__DEBUG_LABEL === `[1].simplify` // COMMENT
    global.__DEBUG_TREE_PHASE = `simplify` // COMMENT

    this.NRS = new NodeReplacementSystem()
    this.NRS.setRulesets(this.rulesets)

    // ST.root.debug()
    // const exp = ST.expression(true)
    // console.log(exp)
    // console.log(`.`)

    // if (__DEBUG) debugger // COMMENT

    const tree = ST.clone()

    // _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    // _logger
    //   .add(paint.grey(`WTF IS WRONG HERE?`)) //
    //   .info()
    // _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    // tree.root.getTreeContent({ hideContent: true })
    // print(tree.root, { expression: exp })

    // const aaaa2 = tree.root.getDebugContent({ showType: false })
    // evaluateTreeScope(tree, { master: this.options.scope })

    // tree.root.debug()
    // console.log(tree.expression(true))
    // console.log(`.`)

    // this.NRS.process(tree.root, {
    //   operationOptions: { refreshIndexing: false },
    //   scope: this.options.scope,
    //   grammar: this.grammar,
    //   //
    //   tag: `simplify`,
    //   run: 1,
    // })

    tree.root.refreshIndexing()

    // tree.root.debug()

    tree.expression(true)
    evaluateTreeScope(tree, { master: this.options.scope })

    // tree.root.debug()

    return tree
  }

  /** Process tokenized expression into an AST */
  private _process() {
    this.SST = this._simplifySemanticTree(this.ST, this.environment)
  }

  print(options: PrintOptions) {
    const logger = _logger

    // 1. Print Tree
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`SIMPLIFIED SEMANTIC TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    print(this.SST.root, options)

    this.NRS.print(`simplify`)
  }
}
