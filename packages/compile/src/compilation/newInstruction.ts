import { generateReactionHash, Reaction } from "../reactive/reaction"
import type ReactiveCompilableObject from "../reactive/object"
import type { CompilationStack } from "./stack"

export class CompilationInstruction {
  stack: CompilationStack // stack index
  //
  hash: string
  reaction: Reaction

  constructor(reaction: Reaction) {
    this.reaction = reaction

    // TODO: I dont think object.id is necessary here, since the flat definition already carries the object id (tecnically the flat strict object reference)
    this.hash = `${generateReactionHash(reaction)}`
  }

  preValidate() {
    const object = this.stack.manager.objects[this.reaction.definition.object.id]
    const { strategy } = object.strategies[this.reaction.definition.strategy] ?? {}

    // ERROR: Strategy does not exist in object
    if (!strategy) debugger

    const definition = strategy.definitions.get(this.reaction.definition.name)!

    // ERROR: Reaction does not exist in strategy
    if (!definition) debugger

    // ERROR: Reaction does not have a name
    if (!definition.name) debugger

    return true
  }
}
