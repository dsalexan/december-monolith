import { expression, simplify } from "mathjs"
import assert from "assert"
import { filter, isNil, range } from "lodash"
import { Interval, Point, Range } from "@december/utils"

import churchill, { Block, paint, Paint } from "../../logger"

import Node, { PrintOptions, print, SubTree } from "../../node"

import type { BaseProcessingOptions } from "../../options"

import Environment from "../../environment"
import { postOrder } from "../../node/traversal"
import { getMasterScope, MasterScope, Scope } from "../../node/scope"
import Simplify, { SimplifyOptions } from "../simplify"
import Reducer, { ReducerOptions } from "../reducer"
import { process, RuleSet } from "../../nrs"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface BaseResolverOptions {
  SimplifyNRS: RuleSet[]
  //
  simplify?: SimplifyOptions
  reducer?: ReducerOptions
}

export type ResolverOptions = BaseResolverOptions & BaseProcessingOptions

export default class Resolver {
  public options: ResolverOptions
  private simplify: Simplify
  private reducer: Reducer
  //
  private tree: SubTree
  private environment: Environment
  public result: SubTree
  //

  constructor(simplify: Simplify, reducer: Reducer) {
    this.simplify = simplify
    this.reducer = reducer
  }

  /** Defaults options for parser */
  _options(options: Partial<ResolverOptions>) {
    this.options = {
      ...options,
      logger: options.logger ?? _logger,
      debug: options.debug ?? false,
      scope: options.scope!,
      //
      SimplifyNRS: options.SimplifyNRS!,
    }

    return this.options
  }

  /** Start Resolution Loop with tree + environment */
  process(tree: SubTree, environment: Environment, options: Partial<ResolverOptions> = {}) {
    this._options(options) // default options

    this.tree = tree
    this.environment = environment

    this._process()

    return this.tree
  }

  private _process() {
    let i = 0
    const STACK_OVERFLOW_PROTECTION = 100

    this.result = this.tree

    // 1. Resolve tree
    let lastExpression = this.result.expression()
    while (i < STACK_OVERFLOW_PROTECTION) {
      this.result = this._resolve(this.result, i)

      // check if we can stop
      const newExpression = this.result.expression()
      if (newExpression === lastExpression) break

      lastExpression = newExpression
      i++
    }
  }

  private _resolve(tree: SubTree, i: number) {
    const __DEBUG = true // COMMENT

    // 1. Simplify expression
    global.__DEBUG_LABEL = `[${i}].simplify` // COMMENT

    const beforeSimplify = tree.expression()

    this.simplify.process(tree, this.environment, this.options.SimplifyNRS, this.options.simplify)

    // if there were no changes, stop
    if (beforeSimplify === this.simplify.SST.expression()) return this.simplify.SST

    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()

      const expression = this.simplify.SST.expression()
      this.simplify.print({ expression })
    }

    // 2. Reduce expression
    global.__DEBUG_LABEL = `[${i}].reduce` // COMMENT

    this.reducer.process(this.simplify.SST, this.environment, this.options.reducer)
    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()

      const expression = this.reducer.RT.expression()
      this.reducer.print({ expression })
    }

    return this.reducer.RT
  }

  print(options: PrintOptions) {
    const logger = _logger

    // 1. Print Scope
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`ENVIRONMENT`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    console.log(this.environment)

    // 2. Print Abstract Tree
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`RESULT`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    print(this.result.root, options)
  }
}

interface BaseNodeInstruction {
  protocol: string
}

interface GenericNodeInstruction extends BaseNodeInstruction {
  protocol: `process-child` | `elementary-algebra`
}

interface GetValueNodeInstruction extends BaseNodeInstruction {
  protocol: `get-value`
  type: `string` | `number` | `boolean`
}

type NodeInstruction = GenericNodeInstruction | GetValueNodeInstruction

type TNodeInstructionFactory<TInstruction extends NodeInstruction = NodeInstruction> = (...args: any[]) => TInstruction

const GET_VALUE: TNodeInstructionFactory<GetValueNodeInstruction> = (type: GetValueNodeInstruction[`type`]) => ({ protocol: `get-value`, type })
const PROCESS_CHILD: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `process-child` })
const ELEMENTARY_ALGEBRA: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `elementary-algebra` })
