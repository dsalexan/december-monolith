import { PropertyReference } from "@december/utils/access"

import { ObjectPropertyReference, StrictObjectPropertyReference, UniqueObjectPropertyReference } from ".."

export interface BaseEvent {
  type: string
}

export interface UpdatePropertyEvent {
  type: `update:property`
  property: ObjectPropertyReference
}

export const EVENT_TYPES = [`update:property`] as const
export type EventType = Event[`type`]

export type Event = UpdatePropertyEvent
