import assert from "assert"
import { EventEmitter } from "@billjs/event-emitter"

import type MutableObject from "../../object"

import type ObjectManager from ".."
import { Event, EventType } from "./events"

export type ListenerID = string

export interface ListenerFunctionContext {
  emitter: ObjectEventEmitter
  manager: ObjectManager
}
export type ListenerFunction = (context: ListenerFunctionContext) => void

export type EventListener = {
  event: Event
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

  addListener(event: Event, id: string, listener: ListenerFunction) {
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

  on(event: Event, id: string, listener: ListenerFunction) {
    return this.addListener(event, id, listener)
  }

  emit(event: Event) {
    const listenersOfType = this.listeners[event.type]

    if (!listenersOfType) return false

    for (const listener of listenersOfType.values()) {
      const { property } = listener.event
      if (!event.property.isEqual(property)) continue

      const context: ListenerFunctionContext = {
        emitter: this,
        manager: this.manager,
      }

      listener.listener(context)
    }

    return true
  }
}
