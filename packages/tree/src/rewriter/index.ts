import { AnyObject, MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { orderBy, sum } from "lodash"
import assert, { match } from "assert"

import churchill, { Block, paint, Paint } from "../logger"

import { Expression, ExpressionStatement, Node, Statement } from "../tree"
import GraphRewritingSystem from "./graphRewrittingSystem"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { default as GraphRewritingSystem, createGraphRewritingRule } from "./graphRewrittingSystem"
export type { GraphRewritingRule, PatternTargetMatch } from "./graphRewrittingSystem"
export { DEFAULT_GRAPH_REWRITING_RULESET } from "./graphRewrittingSystem/default"

export interface RewriterOptions {
  logger: typeof _logger
}

export default class Rewriter<TOptions extends RewriterOptions = RewriterOptions> {
  public options: TOptions
  //
  private AST: Node
  public rewritingSystem: GraphRewritingSystem
  //
  public rewrittenAST: Node

  public process(AST: Node, rewritingSystem: GraphRewritingSystem, options: WithOptionalKeys<TOptions, `logger`>) {
    this.options = {
      logger: options.logger ?? _logger,
      ...options,
    } as TOptions

    this.AST = AST
    this.rewritingSystem = rewritingSystem

    this.rewrittenAST = this.rewrite()

    return this.rewrittenAST
  }

  protected rewrite() {
    const rewrittenAST = this.rewritingSystem.apply(this.AST)

    return rewrittenAST
  }

  public print() {
    const logger = _logger

    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`REWRITTEN AST`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    console.log(` `)

    // _logger.add(this.rewrittenAST.getContent()).info()
    this.rewrittenAST.print()
    // logger.add(paint.grey(this.result.type)).info()
    // logger.add(paint.white.bold(this.result.value)).info()
  }
}
