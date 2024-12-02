import { AnyObject } from "tsdef"

import uuid from "@december/utils/uuid"

import { Event, EventDispatcher, TargetableObject, TargetEvent } from "./event"

import type ObjectEventEmitter from "./index"

import { IntegrityEntry } from "../integrityRegistry"
import { ObjectID } from "../../object"

/**
 * A Listener is the object that will call a function (callback) when a target event is emitted.
 * JUST THAT
 *
 * Anything about queueing in the CallQeueue should be executed inside the callback, the eventEmitter (or the listener)
 *  dont care about that
 */

export interface ListenerCallbackMetadata {
  listener: Listener
  eventEmitter: ObjectEventEmitter
}

export type ListenerCallback<TEvent extends Event = Event, TTargetEvent extends TargetEvent = TargetEvent> = (event: EventDispatcher<TEvent, TTargetEvent>, metadata: ListenerCallbackMetadata) => void

export interface GenericListener extends TargetableObject {
  // targetEvent: TargetEvent
  callback: ListenerCallback
  integrityEntries?: IntegrityEntry[]
}

export interface Listener extends GenericListener {
  id: string
}

export function getListenerID(objectID: ObjectID, { targetEvent }: GenericListener): string {
  const hash = uuid().substring(0, 8)
  return `${objectID}::${targetEvent.type}::${hash}`
}

export function createListener(objectID: ObjectID, listener: GenericListener): Listener {
  return {
    id: getListenerID(objectID, listener),
    ...listener,
  }
}
