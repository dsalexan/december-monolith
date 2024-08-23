import { expression, simplify } from "mathjs"
import assert from "assert"
import { filter, isNil, range } from "lodash"
import { Interval, Point, Range } from "@december/utils"

import churchill, { Block, paint, Paint } from "../../logger"

import { PrintOptions } from "../../tree/printer"
import Tree from "../../tree"
import Node from "../../node"

import type { BaseProcessingOptions } from "../../options"

import Environment from "../../environment"
import { postOrder } from "../../node/traversal"
import { getMasterScope, MasterScope, Scope } from "../../node/scope"
import Simplify, { SimplifyOptions } from "../simplify"
import Reducer, { ReducerOptions } from "../reducer"
import { NodeReplacementSystem } from "../../nrs"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface BaseResolverOptions {
  SNRS: NodeReplacementSystem
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
  private tree: Tree
  private environment: Environment
  public result: Tree
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
      scope: options.scope!,
      //
      SNRS: options.SNRS!,
    }

    return this.options
  }

  /** Start Resolution Loop with tree + environment */
  process(tree: Tree, environment: Environment, options: Partial<ResolverOptions> = {}) {
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
    let lastExpression = ``
    while (i < STACK_OVERFLOW_PROTECTION) {
      this.result = this._resolve(this.result, i)

      // check if we can stop
      if (this.tree.expression === lastExpression) break

      lastExpression = this.tree.expression
      i++
    }
  }

  private _resolve(tree: Tree, i: number) {
    const __DEBUG = true // COMMENT

    // 1. Simplify expression
    global.__DEBUG_LABEL = `[${i}].simplify` // COMMENT

    const beforeSimplify = tree.expression

    this.simplify.process(tree, this.environment, this.options.SNRS, this.options.simplify)

    // if there were no changes, stop
    if (beforeSimplify === this.simplify.SST.expression) return this.simplify.SST

    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()

      this.simplify.print({})
    }

    // 2. Reduce expression
    global.__DEBUG_LABEL = `[${i}].reduce` // COMMENT

    this.reducer.process(this.simplify.SST, this.environment, this.options.reducer)
    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()

      this.reducer.print({})
    }

    return this.reducer.RT
  }

  print(options: PrintOptions = {}) {
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

    this.result.print(this.result.root, options)
    // _logger.add(paint.white(this.tree)).info()
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
