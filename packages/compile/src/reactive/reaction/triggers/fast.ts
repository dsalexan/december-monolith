import { isRegExp } from "lodash"
import type { ReactionTrigger } from "."
import type { ObjectReference, PropertyReference } from "../../../reference"
import type { ReactionPolicy } from "./policy"

/**
 * A "FastReactionTrigger" is a overloaded definition of a reaction follow (useful while coding)
 */
export type FastReactionTrigger = ReactionTrigger | PropertyReference[`path`] | string

/** Attempt to extract policy from string definitions */
export function _extractPolicy(_definition: FastReactionTrigger, defaultPolicy: ReactionPolicy): [FastReactionTrigger, ReactionPolicy] {
  let policy: ReactionPolicy | undefined
  let definition = _definition

  if (typeof _definition === `string`) {
    const [_definition2, _policy] = _definition.split(`//`).reverse() as [string, ReactionPolicy | undefined]

    definition = _definition2
    policy = _policy
  }

  return [definition, policy ?? defaultPolicy]
}

export function defineReactionTrigger(_definition: FastReactionTrigger, defaultObject: ObjectReference): ReactionTrigger {
  /**
   * For the purposes of definition, a "GenericTarget" is Omit<ReactionFollow, `policy`>
   * a.k.a. everything in a reaction target that is not common to all extended types
   */

  // TARGET_AND_POLICY (ReactionPolicy//GenericTarget)
  const [definition, policy] = _extractPolicy(_definition, `always`)

  // {TARGET (GenericTarget)}

  // EVENT TARGET (event:EVENT_NAME)
  if (typeof definition === `string` && definition.startsWith(`event:`)) {
    const [, ...event] = definition.split(`:`)
    return { policy, type: `event`, name: event.join(`:`) }
  }
  // PATH (PropertyReference[`path`])
  else if (typeof definition === `string` || isRegExp(definition)) {
    return {
      policy,
      type: `property`,
      property: {
        object: defaultObject,
        path: definition,
      },
    }
  }

  // TARGET (full object)
  return definition
}
