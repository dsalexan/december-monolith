import { isNil } from "lodash"
import type ReactiveCompilableObject from "../reactive/object"
import { generateReactionHash, Reaction } from "../reactive/reaction"
import * as Utils from "../reference/utils"

export interface CompilationStack {
  index: number
  tags: string[]
  //
  instructions: CompilationInstruction[]
  // indexes are filled inside compilationInstruction
  byReaction: Record<string, [number, number]> // object id + reaction pointer (as string) -> (instruction index, reactionWithTrigger index)
  byObject: Record<string, number[]> // object id -> instruction index
}

export class CompilationInstruction {
  stack: CompilationStack // stack index
  index: number // position in stack
  //
  object: ReactiveCompilableObject // object id to execute instruction on
  strategy: string // specific strategy of object to open (since we aggregate all reactions of the same strategy to be run together in the same instruction)
  /**
   * Here we have a list of reactions to run.
   * It is like this because we want to cluster all changes FROM A STRATEGY together (design choice)
   */
  reactions: Reaction[]

  constructor(stack: CompilationStack, index: number, object: ReactiveCompilableObject, strategy: string) {
    this.stack = stack
    this.index = index
    //
    this.object = object
    this.strategy = strategy

    this.reactions = []

    // index in stack
    if (!this.stack.byObject[this.object.id]) this.stack.byObject[this.object.id] = []

    // ERROR: This instruction is already at the stack
    if (this.stack.byObject[this.object.id].includes(this.index)) debugger

    this.stack.byObject[this.object.id].push(this.index)
  }

  addReaction(reaction: Reaction) {
    // 1. check if strategy matches (since all reactions SHOULD BE from the same strategy)
    if (this.strategy !== reaction.reference.strategy) debugger

    // 2. check reaction uniqueness in current stack (by hash)
    const hash = `${this.object.id}::${generateReactionHash(reaction)}`

    // ERROR: REACTION MUST BE UNIQUE WITHIN STACK (i.e. reaction should not be called twice in the same stack run for the same object (for the same regex match))
    if (this.stack.byReaction[hash]) debugger

    // 3. add reaction to instruction (and index it)
    const reactionIndexInArray = this.reactions.length
    this.reactions.push(reaction)

    // 4. index in stack
    this.stack.byReaction[hash] = [this.index, reactionIndexInArray]
  }

  preValidate() {
    const strategy = this.object.strategies[this.strategy]
    if (!strategy) debugger

    // on creating instructions we already cluster all reactions of the same stragy (so ReactionPointer.strategy is irrelevant here)
    for (const { reference } of this.reactions) {
      const reactionObject = strategy.reactions[reference.index]

      if (!reactionObject) debugger
      if (!reactionObject._name) debugger
    }

    return true
  }
}
