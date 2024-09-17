import { PropertyReference, PropertyReferencePattern } from "@december/utils/access"

import { ObjectPropertyReference, StrictObjectPropertyReference, UniqueObjectPropertyReference } from "../../object/property"
import { ObjectReference } from "../../object"

export interface BaseEvent {
  type: string
}

export const EVENT_TYPES = [`update:property`] as const
export type EventType = Event[`type`]

export interface UpdatePropertyEvent_Listen {
  type: `update:property`
  properties: PropertyReferencePattern<ObjectReference>[]
}

export type Event_Listen = UpdatePropertyEvent_Listen

export interface UpdatePropertyEvent_Handle {
  type: `update:property`
  property: ObjectPropertyReference
}

export type Event_Handle = UpdatePropertyEvent_Handle
