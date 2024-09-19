import { PropertyReference, PropertyReferencePattern, ReferencePattern } from "@december/utils/access"

import { ObjectPropertyReference, StrictObjectPropertyReference, UniqueObjectPropertyReference } from "../../object/property"
import { ObjectReference } from "../../object"

export interface BaseEvent {
  type: string
}

export const EVENT_TYPES = [`update:property`, `reference:indexed`] as const
export type EventType = Event_Listen[`type`]

export interface UpdatePropertyEvent_Listen {
  type: `update:property`
  properties: PropertyReferencePattern<ObjectReference>[]
}

export interface ReferenceIndexedEvent_Listen {
  type: `reference:indexed`
  references: ReferencePattern<ObjectReference>[]
}

export type Event_Listen = UpdatePropertyEvent_Listen | ReferenceIndexedEvent_Listen

export interface UpdatePropertyEvent_Handle {
  type: `update:property`
  property: ObjectPropertyReference
}

export interface ReferenceIndexedEvent_Handle {
  type: `reference:indexed`
  reference: ObjectReference
}

export type Event_Handle = UpdatePropertyEvent_Handle | ReferenceIndexedEvent_Handle

function match_UpdateProperty<TListener>(event: UpdatePropertyEvent_Handle, listeners: [Event_Listen, TListener][]) {
  return listeners.filter(([listeningEvent, listener]) => {
    if (listeningEvent.type !== event.type) return false
    return listeningEvent.properties.some(pattern => pattern.match(event.property))
  })
}

function match_ReferenceIndexed<TListener>(event: ReferenceIndexedEvent_Handle, listeners: [Event_Listen, TListener][]) {
  return listeners.filter(([listeningEvent, listener]) => {
    if (listeningEvent.type !== event.type) return false
    return listeningEvent.references.some(pattern => pattern.match(event.reference))
  })
}

export function matchListeners<TListener>(event: Event_Handle, listeners: [Event_Listen, TListener][]) {
  if (event.type === `update:property`) return match_UpdateProperty<TListener>(event, listeners)
  else if (event.type === `reference:indexed`) return match_ReferenceIndexed<TListener>(event, listeners)

  // @ts-ignore
  throw new Error(`Unimplemented event type "${event.type}"`)
}
