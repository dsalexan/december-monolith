import { isRegExp } from "lodash"
import { ExplicitPropertyReference, ObjectReference, PropertyReference, StrictPropertyReference } from "../../../reference"
import { ReactionHistory } from "../context"
import { ReactionPolicy } from "./policy"

export type { FastReactionTrigger } from "./fast"
export { defineReactionTrigger } from "./fast"

export type { ReactionPolicy } from "./policy"

export interface BaseReactionTrigger {
  type: `property` | `event`
  policy: ReactionPolicy
}

export interface PropertyTrigger<TProperty extends PropertyReference = PropertyReference> extends BaseReactionTrigger {
  type: `property`
  property: TProperty
}

export interface EventTrigger extends BaseReactionTrigger {
  type: `event`
  name: string
}

export type ReactionTrigger = PropertyTrigger | EventTrigger
export type StrictReactionTrigger = PropertyTrigger<StrictPropertyReference> | EventTrigger
export type ExplicitReactionTrigger = PropertyTrigger<ExplicitPropertyReference> | EventTrigger
