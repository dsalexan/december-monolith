import { PropertyReference, PropertyReferencePattern, ReferencePattern } from "@december/utils/access"
import { ElementPattern } from "@december/utils/match/element"

import { ObjectPropertyReference, StrictObjectPropertyReference, UniqueObjectPropertyReference } from "../../object/property"
import { ObjectID, ObjectReference } from "../../object"
import { Signature, SignaturePattern, SignatureReference } from "./signature"

export interface BaseEvent_Listen {
  type: string
}

export const EVENT_TYPES = [`update:property`, `reference:indexed`, `signature:added`, `signature:updated`] as const
export type EventType = Event_Listen[`type`]

export interface UpdatePropertyEvent_Listen extends BaseEvent_Listen {
  type: `update:property`
  properties: PropertyReferencePattern<ObjectReference>[]
}

export interface ReferenceIndexedEvent_Listen extends BaseEvent_Listen {
  type: `reference:indexed`
  references: ReferencePattern<ObjectReference>[]
}

export interface SignatureAddedEvent_Listen extends BaseEvent_Listen {
  type: `signature:added`
  signatures: SignaturePattern[]
}

export interface SignatureUpdatedEvent_Listen extends BaseEvent_Listen {
  type: `signature:updated`
  signatures: SignaturePattern[]
}

export type Event_Listen = UpdatePropertyEvent_Listen | ReferenceIndexedEvent_Listen | SignatureAddedEvent_Listen | SignatureUpdatedEvent_Listen

export interface UpdatePropertyEvent_Handle {
  type: `update:property`
  property: ObjectPropertyReference
}

export interface ReferenceIndexedEvent_Handle {
  type: `reference:indexed`
  reference: ObjectReference
}

export interface SignatureAddedEvent_Handle {
  type: `signature:added`
  signature: SignatureReference
}

export interface SignatureUpdatedEvent_Handle {
  type: `signature:updated`
  id: string
  oldValue: string
  value: string | undefined
}

export type Event_Handle = UpdatePropertyEvent_Handle | ReferenceIndexedEvent_Handle | SignatureAddedEvent_Handle | SignatureUpdatedEvent_Handle

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

function match_SignatureUpdated<TListener>(event: SignatureUpdatedEvent_Handle, listeners: [Event_Listen, TListener][]) {
  return listeners.filter(([listeningEvent, listener]) => {
    if (listeningEvent.type !== event.type) return false
    return listeningEvent.signatures.some(pattern => pattern.match(event.id))
  })
}

export function matchListeners<TListener>(event: Event_Handle, listeners: [Event_Listen, TListener][]) {
  if (event.type === `update:property`) return match_UpdateProperty<TListener>(event, listeners)
  else if (event.type === `reference:indexed`) return match_ReferenceIndexed<TListener>(event, listeners)
  else if (event.type === `signature:updated`) return match_SignatureUpdated<TListener>(event, listeners)

  // @ts-ignore
  throw new Error(`Unimplemented event type "${event.type}"`)
}
