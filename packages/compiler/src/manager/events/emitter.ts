import assert from "assert"
import { EventEmitter } from "@billjs/event-emitter"

import type MutableObject from "../../object"

import type ObjectManager from ".."
import { Event_Handle, Event_Listen, EventType } from "./events"

export type ListenerID = string

export interface ListenerFunctionContext {
  emitter: ObjectEventEmitter
  manager: ObjectManager
}
export type ListenerFunction = (context: ListenerFunctionContext) => void

export type EventListener = {
  event: Event_Listen
  id: string
  listener: ListenerFunction
}

export default class ObjectEventEmitter {
  public manager: ObjectManager
  //
  protected listeners: Record<EventType, Map<ListenerID, EventListener>> = {} as any

  constructor(manager: ObjectManager) {
    this.manager = manager
  }

  addListener(event: Event_Listen, id: string, listener: ListenerFunction) {
    this.listeners[event.type] ??= new Map()

    const listeners = this.listeners[event.type]

    assert(!listeners.has(id), `Listener "${id}" already exists`)

    const eventListener: EventListener = {
      event,
      id,
      listener,
    }

    listeners.set(id, eventListener)
  }

  on(event: Event_Listen, id: string, listener: ListenerFunction) {
    return this.addListener(event, id, listener)
  }

  emit(event: Event_Handle) {
    const listenersOfType = this.listeners[event.type]

    if (!listenersOfType) return false

    for (const listener of listenersOfType.values()) {
      const { properties } = listener.event
      if (!properties.some(pattern => pattern.match(event.property))) continue

      const context: ListenerFunctionContext = {
        emitter: this,
        manager: this.manager,
      }

      listener.listener(context)
    }

    return true
  }
}
