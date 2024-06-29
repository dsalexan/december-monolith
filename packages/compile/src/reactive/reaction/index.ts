/**
 * A Reaction is a reference to its definition and the whys it is being executed.
 */

import { ExplicitObjectReference, FlatObjectReference, ReactionDefinitionReference, StrictObjectReference } from "../../reference"
import { ReactionCause, ReactionContext, ReactionTrace } from "./context"
import * as Utils from "../../reference/utils"
import { has, omit } from "lodash"

export { ReactionInstruction } from "./definition"
export type { ReactionDefinition } from "./definition"
export type { ReactionTrigger, StrictReactionTrigger, ExplicitReactionTrigger } from "./triggers"

/** A non parallelized reaction, without aggregating its many variants in a unique execution directive */
export interface ParallelReaction {
  target: StrictObjectReference
  definition: ReactionDefinitionReference<StrictObjectReference>

  trace: ReactionTrace // trace is a linear sequence of causes, ordered; defines WHY a reaction is running
  context: ReactionContext
}

/** Extra data related to a reaction, but without it's definition or causes (it is basically a context, but I have already a variable named context) */
export type ParallelReactionData = Omit<ParallelReaction, `target` | `definition` | `trace`>

export interface Reaction {
  target: StrictObjectReference
  definition: ReactionDefinitionReference<StrictObjectReference>

  // every unique "reason" why a reaction is running is a "parallel"
  //    those parallels can latter be aggregated as ParallelReactionContexts or Causes
  parallels: Omit<ParallelReaction, `target` | `definition`>[]
}

function isParallelReaction(reaction: Reaction | ParallelReaction): reaction is ParallelReaction {
  return !has(reaction, `parallels`)
}

export function generateReactionHash(_reaction: Reaction | ParallelReaction): string {
  /**
   * A Reaction is (as its basest, like in ParallelReaction):
   *
   *  - a TARGET (the object in the scope of execution of the processing functions)
   *  - a DEFINITION (the very set of processing functions)
   *  - a TRACE (list os causes that explain why a reaction is running)
   *  - a CONTEXT (any other additional information relevant for the runtime of processing functions)
   *
   * Inside context there is something called "hash", that is a unique identifier for a reaction.
   * Regex also acts as a unique identifier for a reaction, like a "default" hash.
   */

  let hash: string[] = []

  hash.push(Utils.Object.flatten(_reaction.target))
  hash.push(Utils.Reaction.flatten(_reaction.definition))

  let reaction: Omit<ParallelReaction, `target` | `definition`> = _reaction as any
  if (!isParallelReaction(_reaction)) {
    // TODO: how to deal with N parallels in hash?
    if (_reaction.parallels.length !== 1) debugger

    reaction = _reaction.parallels[0]!
  }

  //    add custom hash keys if applicable
  if (Object.keys(reaction.context.hash ?? {}).length) {
    const custom = reaction.context.hash
    const _custom = Object.keys(custom!).map(key => `[${key}]${custom![key]}`)
    hash.push(_custom.join(`::`))
  }

  //    add regex from context if applicable
  if (reaction.context.regex?.length) {
    debugger
    // In regex matches, multiple reactions can be added for different capturing groups (and currently the hash doesn't consider the capturing groups since they are not parte of explained reaction)
    const regex = reaction.context.regex
    hash.push(`[regex]${regex.join(`_`)}`)
  }

  return hash.join(`:::`)
}

export function unifyParallelReactions(...parallelReactions: ParallelReaction[]): Reaction {
  // (strategy, name) is refering to a reaction definition (a.k.a. the set of processing functions to be executed)
  const _targets = parallelReactions.map(parallelReaction => parallelReaction.target)

  const _ids = parallelReactions.map(parallelReaction => parallelReaction.definition.object.id)
  const _strategies = parallelReactions.map(parallelReaction => parallelReaction.definition.strategy)
  const _names = parallelReactions.map(parallelReaction => parallelReaction.definition.name)

  // check if all reactions have the same definition
  const areAllTargetsEqual = _targets.every(target => Utils.Object.isEqual(target, _targets[0]))

  const areAllIdsEqual = _ids.every(id => id === _ids[0])
  const areAllStrategiesEqual = _strategies.every(strategy => strategy === _strategies[0])
  const areAllNamesEqual = _names.every(index => index === _names[0])

  // ERROR: All reactions should run the same definition to be unified
  if (!areAllTargetsEqual) debugger
  if (!areAllIdsEqual || !areAllStrategiesEqual || !areAllNamesEqual) debugger

  const definition: ReactionDefinitionReference<StrictObjectReference> = {
    object: { type: `id`, id: _ids[0] },
    strategy: _strategies[0],
    name: _names[0],
  }

  const reaction: Reaction = {
    target: _targets[0],
    definition,
    //
    parallels: parallelReactions.map(parallelReactions => omit(parallelReactions, `definition`)),
  }

  return reaction
}

export function injectCause(parallelReaction: ParallelReaction | Omit<ParallelReaction, `trace`>, trace: ReactionTrace): ParallelReaction {
  const _reaction = parallelReaction as ParallelReaction
  _reaction.trace ??= []
  _reaction.trace.push(...trace)

  return _reaction
}
