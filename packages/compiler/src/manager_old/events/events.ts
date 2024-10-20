import { PropertyReference, PropertyReferencePattern, ReferencePattern } from "@december/utils/access"
import { ElementPattern } from "@december/utils/match/element"

import { ObjectPropertyReference, StrictObjectPropertyReference, UniqueObjectPropertyReference } from "../../object/property"
import { ObjectID, ObjectReference } from "../../object"
import { Signature, SignaturePattern, SignatureReference } from "./signature"
import { logger } from "./emitter"
import { paint } from "../../logger"

// #region TRACE

export interface BaseEventTrace {}

export interface ReferenceEventTrace extends BaseEventTrace {
  type: `reference`
  action: `added` | `updated` | `removed`
  reference: ObjectReference
}

export interface SignatureChangedEventTrace extends BaseEventTrace {
  type: `signature-changed`
  id: Signature[`id`]
  expectedValue: Signature[`value`]
  currentValue: Signature[`value`] | undefined
}

export interface CascadeUpdateEventTrace extends BaseEventTrace {
  type: `cascade-update`
  object: ObjectReference
  properties: ObjectPropertyReference[`property`][]
}

export type EventTrace = CascadeUpdateEventTrace | ReferenceEventTrace | SignatureChangedEventTrace

export function explainEventTrace(_logger: typeof logger, trace: EventTrace) {
  _logger.add(paint.cyan.dim(`${` `.repeat(1)}${`-`.repeat(29)}`))
  _logger.add(paint.cyan(`◀ `))
  _logger.add(paint.dim.cyan.italic(`(${trace.type}) `))

  if (trace.type === `cascade-update`) {
    _logger.add(paint.dim.white(`${trace.object.toString()}:`))
    if (trace.properties.length === 1) _logger.add(paint.white(`${trace.properties[0].toString()}`))
    else _logger.add(paint.dim.grey(`{${trace.properties.length} properties}`))
  } else if (trace.type === `reference`) {
    _logger
      .add(paint.dim.white(`${trace.action} `)) //
      .add(paint.white(`${trace.reference.toString()}`))
  } else if (trace.type === `signature-changed`) {
    _logger
      .add(paint.grey(`(`)) //
      .add(paint.white(`${trace.id} `)) //
      .add(paint.grey(`) `)) //
      .add(paint.grey(`${trace.expectedValue}`))
      .add(paint.grey.dim(` <> `)) //
      .add(paint.grey.dim(`"`)) //
      .add(paint.white.bold(`${trace.currentValue}`))
      .add(paint.grey.dim(`"`)) //
  } else {
    // @ts-ignore
    throw new Error(`Unimplemented event trace type "${trace.type}"`)
  }
}

// #endregion

export interface BaseEvent_Listen {
  type: string
  data?: Record<string, any>
}

export interface BaseEvent_Handle {
  type: string
  trace: EventTrace
}

export type EventDispatched<TEventHandle extends Event_Handle = Event_Handle, TEventListen extends Event_Listen = Event_Listen> = TEventHandle & { dispatcher: TEventListen }

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

export interface UpdatePropertyEvent_Handle extends BaseEvent_Handle {
  type: `update:property`
  property: ObjectPropertyReference
}

export interface ReferenceIndexedEvent_Handle extends BaseEvent_Handle {
  type: `reference:indexed`
  reference: ObjectReference
}

export interface SignatureAddedEvent_Handle extends BaseEvent_Handle {
  type: `signature:added`
  signature: SignatureReference
}

export interface SignatureUpdatedEvent_Handle extends BaseEvent_Handle {
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
