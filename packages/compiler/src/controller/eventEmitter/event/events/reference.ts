import { PropertyReferencePattern, ReferencePattern } from "@december/utils/access"

import { ObjectID, ObjectReference } from "../../../../object"
import { ObjectPropertyReference } from "../../../../object/property"

import { BaseEvent, BaseTargetEvent } from "../base"

/** Object used to FIRE event */
export interface ReferenceAddedEvent extends BaseEvent {
  type: `reference:added`
  reference: ObjectReference
  objectID: ObjectID
}

export interface ReferenceRemovedEvent extends BaseEvent {
  type: `reference:removed`
  reference: ObjectReference
  objectID: ObjectID
}

/** Object used to match some event when emitted */
export interface TargetReferenceAddedEvent extends BaseTargetEvent<ReferenceAddedEvent, `reference` | `objectID`> {
  references: ReferencePattern<ObjectReference>[]
}

export interface TargetReferenceRemovedEvent extends BaseTargetEvent<ReferenceRemovedEvent, `reference` | `objectID`> {
  references: ReferencePattern<ObjectReference>[]
}

export type ReferenceEvents = ReferenceAddedEvent | ReferenceRemovedEvent
export type TargetReferenceEvents = TargetReferenceAddedEvent | TargetReferenceRemovedEvent

export type ReferenceEventTypes = ReferenceEvents[`type`]

export const REFERNECE_ADDED = (...references: ReferencePattern<ObjectReference>[]): TargetReferenceAddedEvent => ({ type: `reference:added`, references })
export const REFERNECE_REMOVED = (...references: ReferencePattern<ObjectReference>[]): TargetReferenceRemovedEvent => ({ type: `reference:removed`, references })
