import { ReactionTriggerReference, StrictObjectReference, StrictPropertyReference } from "../../reference"
import { EventTrigger, PropertyTrigger } from "./triggers"

/**
 * TRIGGER
 *    Why a reaction was triggered
 *    A series of events can cause a reaction to run. For example:
 *      A) A property is updated
 *      B) A object alias is estabilished, prompting the forwarding manager to call a reaction.
 *         This is a combination of:
 *          I) update on "_.aliases"
 *          II) forwarding from the updated property (_.alias.[<index>])
 *      C) A lifecycle event is triggered, calling all reactions that expect a lifecycle event
 */

export interface PropertyUpdated {
  // strict reference to the trigger that caused this reaction to run
  _trigger: PropertyTrigger & { _reference: ReactionTriggerReference }
  //
  type: PropertyTrigger[`type`]
  property: StrictPropertyReference // reference to the property that was updated
}

export interface EventCalled {
  _trigger: EventTrigger & { _reference: ReactionTriggerReference }
  //
  type: EventTrigger[`type`]
  name: string // event called
  data?: any // extra data passed with the event
}

export type ReactionCause = PropertyUpdated | EventCalled

/** A trigger is a linear series of events. It explains WHY a reaction is being executed. Multiple parallel triggers can be considered simutaneous reasons for a reaction to run */
export type ReactionTrace = ReactionCause[] // every event follows the previous one, ORDERED
export type ParallelReactionTraces = ReactionTrace[] // all triggers are simutaneous, UN-ORDERED

/** A history is a linear series of parallel triggers, explaining all causes behing all executions of a reaction */
export type ReactionHistory = ParallelReactionTraces[] // every parallel trigge follows the previous one, ORDERED

/**
 * CONTEXT
 *    Extra information about WHY a reaction is running
 *    History also explains why a reaction is running, by they can be accessed by another argument in processing functions
 *      Why a reaction is currently running can be accessed (if necessary), by history[-1]. Let's call each trigger in "history[-1]" a "parallel"
 *      For each parallel, we can have a distinct context (since they are simutaneous, we can't really "choose" one of the sources of information to pass)
 *      So, in processing functions, we have N contexts, one for each parallel in history[-1]
 */

export interface ReactionContext {
  /**
   * Every reaction has a unique identifier hash (to detect duplicate reactions running in the same stack)
   * When queueing a reaction we can "expland" the hash source map with relevant information that should "individualize" or "contextualize" why this reaction should be treated differently
   *    TODO: Why this is useful?
   */
  hash?: Record<string, any>
  /**
   * If a reaction is running because of a property update, and such updated was matched through a REGEX property reference
   * Here we just list all capturing groups from the regex match
   */
  regex?: string[]
}

export type ParallelReactionContexts = ReactionContext[] // all contexts are simutaneous, UN-ORDERED
