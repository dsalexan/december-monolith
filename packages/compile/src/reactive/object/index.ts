import { cloneDeep, groupBy, isNumber, orderBy, uniq } from "lodash"

import { Builder, paint } from "@december/logger"
import { arrayJoin } from "@december/utils"

import CompilableObject, { UpdateEvent } from "../../object"

import { Factory, Strategy } from "../../strategy"
// import ReactiveCompilableObjectIndexes from "./indexation"
import { type ReactiveCompilationManager, type CompilationManager } from "../.."
import { ParallelReaction, Reaction, unifyParallelReactions } from "../reaction"
import { ExplicitObjectReference, NonAliasPropertyReference, ObjectReference, ReactionInstructionReference, StrategyReference, StrictObjectReference, StrictPropertyReference } from "../../reference"
import * as Utils from "../../reference/utils"
import { ReactionInstruction } from "../reaction/definition"

const StrategyFactory = new Factory()

export default class ReactiveCompilableObject<TData extends object = object> extends CompilableObject<TData> {
  // all reactive strategies to be considered on update
  strategies: Record<string, { priority: number; strategy: Strategy }> = {} // strategy name -> (strategy, priority)
  // strategy indexes
  //    we cant really index regex paths, so we need to centralize a function to return all stragies for a given path (half checking in indexes and half testing all regexes)
  // _: ReactiveCompilableObjectIndexes = new ReactiveCompilableObjectIndexes(this)
  manager: CompilationManager

  constructor(id: string, data?: TData) {
    super(id, data)

    // add local empty strategy
    const local = StrategyFactory.strategy(`local`)
    this.addStrategy(100, local)

    // TODO: Implement self-react (or maybe a unified react at manager?)
  }

  static override make<TData extends object = object>(id: string, data?: TData) {
    return new ReactiveCompilableObject<TData>(id, data)
  }

  addStrategy(...strategies: Strategy[]): this
  addStrategy(priority: number | null, ...strategies: Strategy[]): this
  addStrategy(priorityOrStrategy0: number | null | Strategy, ...strategies: Strategy[]) {
    // parse overload args
    let priority: number = null as any as number
    if (priorityOrStrategy0 === null || isNumber(priorityOrStrategy0)) priority = priorityOrStrategy0 as number
    else strategies.unshift(priorityOrStrategy0 as Strategy)

    priority = priority ?? 0

    // register strategies
    for (const strategy of strategies) {
      // ERROR: Strategy names should be unique
      if (this.strategies[strategy.name]) debugger

      this.strategies[strategy.name] = { strategy, priority }
    }

    return this
  }

  addToManager(manager: CompilationManager, cluster?: string, logger?: Builder) {
    if (logger) {
      if (cluster) logger.add(paint.grey(cluster), ` `)
      logger.add(paint.bold(this.id))

      if (Object.values(this.strategies).length)
        logger.add(
          ` `,
          ...arrayJoin(
            Object.values(this.strategies).map(({ strategy }) => paint.blue(`strategy:`, paint.bold(strategy.name))),
            paint.grey(`, `),
          ).flat(),
        )
      else logger.add(paint.grey(` (No strategies)`))

      logger.debug()
    }

    manager.addObject(this, cluster)

    return this
  }

  addInstruction(instruction: ReactionInstruction, strategyName: string) {
    // 1. strictify instruction since we know the source object id
    const parent: StrategyReference<StrictObjectReference> = { object: { type: `id`, id: this.id }, strategy: strategyName }
    const explicitInstruction = instruction.strictify(parent)

    // 2. add instruction to strategy (post-creation of strategy)
    const { strategy, priority } = this.strategies[strategyName]
    strategy.addInstruction(explicitInstruction)

    // 3. index instruction
    const reactive = this.manager as ReactiveCompilationManager
    reactive._._index_instruction(this, explicitInstruction, priority)
  }
}
