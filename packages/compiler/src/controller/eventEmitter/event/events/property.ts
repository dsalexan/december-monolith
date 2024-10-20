import { PropertyReferencePattern } from "@december/utils/access"

import { ObjectReference } from "../../../../object"
import { ObjectPropertyReference } from "../../../../object/property"

import { BaseEvent, BaseTargetEvent } from "../base"

/** Object used to FIRE event */
export interface PropertyUpdatedEvent extends BaseEvent {
  type: `property:updated`
  property: ObjectPropertyReference
}

/** Object used to match some event when emitted */
export interface TargetPropertyUpdatedEvent extends BaseTargetEvent<PropertyUpdatedEvent, `property`> {
  properties: PropertyReferencePattern<ObjectReference>[]
}

export type PropertyEvents = PropertyUpdatedEvent
export type TargetPropertyEvents = TargetPropertyUpdatedEvent

export type PropertyEventTypes = PropertyEvents[`type`]

export const PROPERTY_UPDATED = (...properties: PropertyReferencePattern<ObjectReference>[]): TargetPropertyUpdatedEvent => ({ type: `property:updated`, properties })
