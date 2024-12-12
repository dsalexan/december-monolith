import { expression, simplify } from "mathjs"
import assert from "assert"
import { filter, isNil, range } from "lodash"

import { Interval, Point, Range } from "@december/utils"
import generateUUID from "@december/utils/uuid"

import churchill, { Block, paint, Paint } from "../../logger"

import Node, { PrintOptions, print, SubTree } from "../../node"

import type { BaseProcessingOptions } from "../../options"

import Environment, { SymbolTable } from "../../environment"
import { postOrder, preOrder } from "../../node/traversal"
import Simplify, { SimplifyOptions } from "../simplify"
import Reducer, { ReducerOptions } from "../reducer"
import { evaluateTreeScope } from "../../node/scope"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface BaseResolverOptions {
  simplify?: SimplifyOptions
  reducer?: ReducerOptions
  includesFallback?: boolean
}

export type ResolverOptions = BaseResolverOptions & BaseProcessingOptions

export default class Resolver {
  public options: ResolverOptions
  private simplify: Simplify
  private reducer: Reducer
  //
  private uuid: string
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
      includesFallback: options.includesFallback ?? false,
    }

    return this.options
  }

  /** Start Resolution Loop with tree + environment */
  process(tree: SubTree, symbolTable: SymbolTable, environment: Environment, options: Partial<ResolverOptions> = {}) {
    this._options(options) // default options

    this.tree = tree
    this.environment = environment

    this._process(symbolTable)

    return this.result
  }

  private _process(symbolTable: SymbolTable) {
    let i = 0
    const STACK_OVERFLOW_PROTECTION = 100

    this.uuid = generateUUID().substring(0, 4).toUpperCase()
    this.result = this.tree

    // 1. Resolve tree
    const expression = this.result.expression()
    let lastExpression = this.result.root.getContent({ wrapInParenthesis: true })

    while (i < STACK_OVERFLOW_PROTECTION) {
      this.result = this._resolve(this.result, symbolTable, i)

      // check if we can stop
      const updatedExpression = this.result.expression()
      const newExpression = this.result.root.getContent({ wrapInParenthesis: true })
      if (newExpression === lastExpression && i > 0) break

      lastExpression = newExpression
      i++
    }
  }

  private _resolve(tree: SubTree, symbolTable: SymbolTable, i: number) {
    const __DEBUG = false // COMMENT

    // 1. Simplify expression
    global.__DEBUG_LABEL = `[${i}].simplify` // COMMENT

    const exp = tree.expression()
    const beforeSimplify = tree.root.getContent({ wrapInParenthesis: true })

    this.simplify.process(tree, this.environment, [], this.options.simplify)
    this.simplify.SST.expression()
    const afterSimplify = this.simplify.SST.root.getContent({ wrapInParenthesis: true })

    // if there were no changes, stop
    if (beforeSimplify === afterSimplify && i > 0) {
      if (__DEBUG) {
        console.log(`\n`)
        _logger.add(paint.grey(global.__DEBUG_LABEL)).info()
        _logger.add(paint.grey.italic.dim(`  (no changes, stop resolve loop)`)).info()
      }

      return this.simplify.SST
    }

    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()

      this.simplify.SST.root.getTreeContent({ hideContent: true })

      const expression = this.simplify.SST.expression()
      this.simplify.print({ expression })
    }

    // 2. Reduce expression
    global.__DEBUG_LABEL = `[${i}].reduce` // COMMENT

    this.reducer.process(this.simplify.SST, this.environment, { ...(this.options.reducer ?? {}), includesFallback: (this.options.reducer ?? {}).includesFallback ?? this.options.includesFallback })
    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()

      this.reducer.RT.root.getTreeContent({ hideContent: true })

      const expression = this.reducer.RT.expression()
      this.reducer.print({ expression })
    }

    // 3. Index symbols in centralized table
    symbolTable.from(`${this.uuid}_${i}`, this.reducer.RT, this.options, false)

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
