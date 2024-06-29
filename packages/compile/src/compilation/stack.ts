import { Builder, paint } from "@december/logger"
import { FlatObjectReference, FlatStrategyReference, ReactionInstructionReference, StrategyReference, StrictObjectReference } from "../reference"
import * as Reference from "../reference/utils"
import { isArray, sum, get } from "lodash"
import { ParallelReactionContexts, ParallelReactionTraces, ReactionContext, ReactionHistory } from "../reactive/reaction/context"

import { generateReactionHash, Reaction, ReactionDefinition, ReactionInstruction } from "../reactive/reaction"
import type ReactiveCompilableObject from "../reactive/object"

import * as Debug from "./debug"
import type CompilationManager from "./newManager"
import { InstructionIndex } from "../instruction"
import { completeInstructionIndex } from "../instruction/fast"
import { BaseContext } from "../reactive/reaction/processing"
import ReactiveCompilationManager from "../reactive/manager"
import type { CompilationInstruction } from "./newInstruction"
import type { Strategy } from "../strategy"

export const COMPILATION_STAGES = [`pre-processing`, `processing`, `post-processing`] as const
export type CompilationStage = (typeof COMPILATION_STAGES)[number]

export class CompilationStack {
  manager: CompilationManager
  state: `idle` | `running` | `spent` = `idle`
  index: number
  tags: string[]
  //
  order: string[] // FlatObjectReference + FlatStrategyReference ordered list of (target object, strategies) to be executed
  // indexes
  _: {
    byTarget: {
      byStrategy: Record<FlatObjectReference, Record<FlatStrategyReference, CompilationInstruction[`hash`][]>> // target -> (definition object, strategy) -> hash[] (since we run instructions grouped by strategy)
    }
    byInstructionHash: Record<CompilationInstruction[`hash`], CompilationInstruction> // hash -> instruction
  }

  constructor(manager: CompilationManager, index: number, tags: string[]) {
    this.manager = manager
    this.index = index
    this.tags = tags
    //
    this.order = []
    this._ = {
      byTarget: {
        byStrategy: {},
      },
      byInstructionHash: {},
    }
  }

  /** Check if instruction should be pushed to stack */
  shouldPush(instruction: CompilationInstruction): { action: `aggregate_triggers` | `accept` | `refuse`; index?: number; explanation?: string } {
    // check if instruction SHOULD be added to stack

    // 0. check if instruction already exists in index
    if (this._.byInstructionHash[instruction.hash]) return { action: `refuse` }

    // 1. fetch list of instructions running the same strategy
    const { definition } = instruction.reaction
    const reactionHash = generateReactionHash(instruction.reaction)

    const _target = Reference.Object.flatten(instruction.reaction.target)
    const _strategy = Reference.Strategy.flatten(definition)
    const instructions = this._.byTarget.byStrategy[_target]?.[_strategy] ?? []

    const definitionObject = this.manager.objects[definition.object.id]
    const { strategy } = definitionObject.strategies[definition.strategy]

    const definitionIndex = strategy.definitions.get(definition.name)!._index

    // 2. check if instruction is already in the list
    let i = 0
    for (i = 0; i < instructions.length; i++) {
      const _other = instructions[i]
      const other = this._.byInstructionHash[_other]

      const otherHash = generateReactionHash(other.reaction)

      // REACTION DEFINITION === set of processing functions
      // get reaction definition for other instruction
      const otherDefinition = other.reaction.definition
      const otherDefinitionIndex = strategy.definitions.get(definition.name)!._index

      if (otherHash === reactionHash) {
        // both reactions have the same identifier hash
        // so there is no need to push instruction, but we still need to aggregate triggers later

        debugger
        return { action: `aggregate_triggers`, index: i }
      }

      if (otherDefinitionIndex > definitionIndex) {
        // other's reaction has a bigger index, so it should run AFTER instruction
        // so instruction is allowed to be pushed
        // no need to continue loop, since i tracks the target index
        break
      }
    }

    // 3. check if instruction is valid
    const isValid = this.manager.validateInstruction(instruction)

    if (!isValid) return { action: `refuse`, explanation: `don't repeat once policy` }

    return {
      action: `accept`,
      index: i,
    }
  }

  /** Push instruction to stack */
  push(instruction: CompilationInstruction) {
    // ERROR: Stack is already running, cannot be
    if (this.state !== `idle`) debugger

    // ERROR: This instruction already exists
    if (this._.byInstructionHash[instruction.hash]) debugger

    const { action, index } = this.shouldPush(instruction)

    // dont push instruction to stack
    if (action === `refuse`) return { action: `instruction_refused` }

    // 1. fetch list of instructions running the same strategy
    const _target = Reference.Object.flatten(instruction.reaction.target)
    const _strategy = Reference.Strategy.flatten(instruction.reaction.definition)
    const instructions = this._.byTarget.byStrategy[_target]?.[_strategy] ?? []

    // dont push instruction to stack, but aggregate triggers
    if (action === `aggregate_triggers`) {
      const _other = instructions[index!]
      const other = this._.byInstructionHash[_other]

      // TODO: Aggregate triggers
      debugger

      return { action: `triggers_aggregated` }
    }

    // push instruction to stack
    // if (action === 'accept')

    // properly add to stack (only if strategy reference isnt already in stack)
    const key = `${_target}×${_strategy}`
    const order = this.order.indexOf(key)
    if (order === -1) this.order.push(key)
    else {
      // Never tested when a instruction is pushed to a stack that already has the same strategy
      //    should not be a problem, unless we are trying to push a instruction with a strategy that was already ran WHILE the stack is running
    }

    // INDEX

    // register instruction by hash
    instruction.stack = this
    this._.byInstructionHash[instruction.hash] = instruction

    // // index by object (TODO: why thou?)
    // this._.byObject[instruction.object.id] ??= []
    // this._.byObject[instruction.object.id].push(instruction.hash)

    // index by strategy (ordered by reaction index)
    this._.byTarget.byStrategy[_target] ??= {}
    this._.byTarget.byStrategy[_target][_strategy] ??= []
    this._.byTarget.byStrategy[_target][_strategy].splice(index!, 0, instruction.hash)

    return { action: `instruction_pushed` }
  }

  /** Pre-validate if all instructions in stack are ready to be executed */
  preValidate(escape = false) {
    let someIsInvalid = false

    for (const key of this.order) {
      const [_target, _strategy] = key.split(`×`) as [FlatObjectReference, FlatStrategyReference]

      const instructions = this._.byTarget.byStrategy[_target]?.[_strategy] ?? []

      for (const hash of instructions) {
        const instruction = this._.byInstructionHash[hash]
        const isValid = !instruction.preValidate()

        if (!isValid) {
          someIsInvalid = true
          if (escape) return false
        }
      }
    }

    return !someIsInvalid
  }

  /** Run compilation instructions in stack order */
  compile() {
    // ERROR: Stack is already running, cannot be
    if (this.state !== `idle`) debugger

    // if there is nothing to run, return "false" as "nothing was done"
    if (!this.order.length) {
      this.state = `spent`

      return false
    }

    const logger = this.manager.logger

    this.state = `running`

    logger.fn(Debug.stack)(this) // COMMENT: Print compilation header

    /**
     * "compiling" is done in three stages:
     * - pre-processing
     *    - this is where the object is "prepared" for the strategy
     *    - what it returns? a modified context?
     * - processing
     *   - this is where the object is "compiled" by the strategy, generating a list of instructions
     * - post-processing
     *  - this is where the list of instructions can be modified by the strategy
     */

    // PRE-VALIDATION (checking if all instructions parts really exist in the object)
    this.preValidate()

    logger.tab()

    // run strategies in order
    let i = 0
    while (i < this.order.length) {
      const key = this.order[i]
      const [_target, _strategy] = key.split(`×`) as [FlatObjectReference, FlatStrategyReference]

      const instructions = this._.byTarget.byStrategy[_target]?.[_strategy] ?? []

      // validate each instruction in list | that list has all instructions with shared (object, strategy)
      const validInstructions: CompilationInstruction[] = []
      for (let j = 0; j < instructions.length; j++) {
        const hash = instructions[j]
        const instruction = this._.byInstructionHash[hash]

        // WARN: Never tested definition object !== target object
        if (Reference.Object.unflatten<StrictObjectReference>(_target).id !== Reference.Strategy.unflatten(_strategy).object.id) debugger

        // check if compilation instruction is still valid
        //     TODO: we are also calling validate instruction on push to stack. so... is it necessary here?
        const isValid = this.manager.validateInstruction(instruction)

        logger.fn(Debug.instruction)(i, j, instructions, instruction, isValid) // COMMENT: Print instruction

        // if Reaction is no longer valid, skip instruction
        if (!isValid) debugger
        if (isValid) validInstructions.push(instruction)
      }

      // run all valid instructions as a group
      const changedKeys = this.run(validInstructions)

      logger.fn(Debug.changedKeys)(changedKeys) // COMMENT: Print changed keys

      i++ // next (object, strategy) tuple
    }

    this.state = `spent`

    logger.tab(-1)

    return true
  }

  /** Run a list of instructions with the same (object, strategy) tuple */
  run(instructions: CompilationInstruction[]): string[] {
    // all that needs validation was already validated in compile
    const instruction = instructions[0]

    const target = this.manager.objects[instruction.reaction.target.id]

    const reactions: Reaction[] = instructions.map(i => i.reaction)

    // 0. update history
    for (const _reaction of reactions) {
      // since "definition" is the set of processing functions, in history we track when each set was executed for a given object
      const _definition = Reference.Reaction.flatten(_reaction.definition)
      const traces: ParallelReactionTraces = _reaction.parallels.map(p => p.trace)

      //    target -> definition (set of processing function) -> triggers
      if (!this.manager._history[target.id][_definition]) this.manager._history[target.id][_definition] = []
      this.manager._history[target.id][_definition].push(traces)

      // handle policy degradation
      for (const triggers of traces) {
        for (const trigger of triggers) {
          if (trigger._trigger.policy === `once`) {
            // TODO: Remove indexes from indexation manager (which effectively disabled the trigger)
            // TODO: Cook a way to "reindex" only the removed trigger if necessary
          }
        }
      }
    }

    // 1. processing (pre and post)
    //    get strategy
    const _strategies = reactions.map(r => r.definition.strategy)

    // ERROR: All strategies must be the same
    if (_strategies.some(s => s !== _strategies[0])) debugger

    const definitionObject = this.manager.objects[instruction.reaction.definition.object.id]
    const { strategy } = definitionObject.strategies[_strategies[0]]

    const processedInstructions = this.process(target, strategy, reactions) // { mutation, reactions }

    // 2. mutate data (apply mutation instructions to object data)
    const mutableData = {} as any
    const mutations = processedInstructions.mutations.filter(instructions => instructions !== null).flat(Infinity) as InstructionIndex[]

    // TODO: Improve HOW to detect which paths were changed (probably by storing change from recipes)
    // if (object.id === `12899`) debugger
    const { recipeIndexes, changedPaths } = target.compile(`instructions`, mutations, mutableData, {})
    target.update(mutableData, recipeIndexes, changedPaths)

    // 3. TODO: Parity
    const parity = get(target.data, `_.parity`) ?? {}
    for (const [key, currentHash] of Object.entries(parity)) {
      // 3.1. get all indexes relying on this key
      const reactive = this.manager as ReactiveCompilationManager
      const instructions = reactive._.instructions.byParent.byParity[target.id]?.[key] ?? []

      if (instructions.length === 0) continue

      // 3.2. since there are dependent instructions, check if key was changed for any of them
      const deprecatedInstructions: ReactionInstruction[] = []
      for (const { reference } of instructions) {
        const _instruction = Reference.Reaction.unflatten<ReactionInstructionReference<StrictObjectReference>>(reference)

        // ERROR: We are expecting a strict reference
        if (_instruction.object.type !== `id`) debugger

        const instruction = reactive.getReactionInstruction(_instruction)
        const hash = instruction.parity?.hash

        if (hash !== currentHash) debugger
        if (hash !== currentHash) deprecatedInstructions.push(instruction)
      }

      // 3.3. remove all deprecated instructions
      for (const instruction of deprecatedInstructions) {
        debugger
      }
    }

    // 4. add dynamic reaction instructions to manager/object/strategy/etc...
    if (processedInstructions.reactions?.length) {
      for (const reactionInstruction of processedInstructions.reactions) {
        // double checking parity (don't know if it is really necessary)
        if (reactionInstruction.parity) {
          const currentHash = parity[reactionInstruction.parity.key]

          if (currentHash !== reactionInstruction.parity.hash) debugger
        }

        const parent = Reference.Object.strictify(reactionInstruction.parent.object, target.id)
        const object = this.manager.objects[parent.id]

        object.addInstruction(reactionInstruction, reactionInstruction.parent.strategy)
      }
    }

    return Object.keys(mutableData)
  }

  process(target: ReactiveCompilableObject, strategy: Strategy, reactions: Reaction[]) {
    const reactionInstructions: ReactionInstruction[] = []

    const preProcessedData = reactions.map(() => null as object | null)
    const processedInstructions = reactions.map(() => null as InstructionIndex | null)
    const postProcessedInstructions = reactions.map(() => null as InstructionIndex | null)

    // process each stage for each reaction
    for (const stage of COMPILATION_STAGES) {
      for (const [i, { target: _target, definition: _definition, parallels }] of reactions.entries()) {
        // ERROR: Process target differs from reaction target
        if (_target.id !== target.id) debugger

        const definition = strategy.definitions.get(_definition.name)!

        const traces: ParallelReactionTraces = parallels.map(p => p.trace)

        // build context
        const __definition = Reference.Reaction.flatten(_definition)
        const history = this.manager._history[target.id][__definition] ?? []
        const context: BaseContext = { history, contexts: parallels.map(p => ({ history, ...p.context })) }

        if (stage === `pre-processing`) preProcessedData[i] = this._pre_process(target, definition, context) ?? null
        else if (stage === `processing`) processedInstructions[i] = this._process(target, definition, context, preProcessedData[i], reactionInstructions) ?? null
        else if (stage === `post-processing`) postProcessedInstructions[i] = this._post_process(target, definition, context, processedInstructions[i])
      }
    }

    return { mutations: postProcessedInstructions, reactions: reactionInstructions }
  }

  _pre_process(target: ReactiveCompilableObject, definition: ReactionDefinition, context: BaseContext) {
    if (!definition.preProcess) return undefined

    // TODO: Implement pre processing
    debugger

    const _preProcessedData = definition.preProcess(target.data, target, this.manager, context)

    return _preProcessedData
  }

  _post_process(target: ReactiveCompilableObject, definition: ReactionDefinition, context: BaseContext, instructions: InstructionIndex | null) {
    if (!definition.postProcess) return instructions

    // TODO: Implement post processing
    debugger

    const postProcessedInstructionIndex = definition.postProcess(instructions, target.data, target, this.manager, context)

    return postProcessedInstructionIndex
  }

  _process(target: ReactiveCompilableObject, definition: ReactionDefinition, context: BaseContext, data: object | null, dynamic: ReactionInstruction[]) {
    if (!definition.process) return undefined

    const strategy = definition.strategy

    // ERROR: Name is mandatory
    if (!definition.name) debugger

    const instructionIndexOrArray = definition.process(target.data, target, data, this.manager, context)
    const [instructionIndex, dynamicReactions] = isArray(instructionIndexOrArray) ? instructionIndexOrArray : [instructionIndexOrArray]

    if (dynamicReactions?.length) dynamic.push(...dynamicReactions)

    // if there is at least one instruction to modify data
    if (instructionIndex) return completeInstructionIndex(instructionIndex, { type: `strategy`, source: `${strategy}::${definition.name}`, strategy, reaction: definition })

    return null
  }
}
