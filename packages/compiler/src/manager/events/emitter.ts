import assert from "assert"
import { EventEmitter } from "@billjs/event-emitter"

import type MutableObject from "../../object"

import type ObjectManager from ".."
import { Event_Handle, Event_Listen, EventType, matchListeners, ReferenceIndexedEvent_Handle, UpdatePropertyEvent_Handle, UpdatePropertyEvent_Listen } from "./events"

import churchill, { Block, paint, Paint } from "../../logger"

export const logger = churchill.child(`node`, undefined, { separator: `` })

export type ListenerID = string

export interface ListenerFunctionContext<TEvent extends Event_Handle = Event_Handle> {
  emitter: ObjectEventEmitter
  manager: ObjectManager
  event: TEvent
}
export type ListenerFunction = (context: ListenerFunctionContext) => void

export interface Listener {
  id: ListenerID
  fn: ListenerFunction
}

export default class ObjectEventEmitter {
  public manager: ObjectManager
  //
  protected listeners: Record<EventType, Map<ListenerID, [Event_Listen, Listener]>> = {} as any

  constructor(manager: ObjectManager) {
    this.manager = manager
  }

  addListener(event: Event_Listen, listener: Listener) {
    this.listeners[event.type] ??= new Map()

    const listeners = this.listeners[event.type]

    assert(!listeners.has(listener.id), `Listener "${listener.id}" already exists`)

    logger
      .add(paint.grey(`[`))
      .add(paint.blue.dim(`on`))
      .add(paint.grey(`] ${event.type} `))

    if (event.type === `update:property`) logger.add(paint.white(event.properties.join(`, `)))
    else if (event.type === `reference:indexed`) logger.add(paint.white(event.references.join(`, `)))

    logger //
      .add(paint.grey(` `))
      .add(paint.blue.bold.dim(listener.id))

    logger.info()

    listeners.set(listener.id, [event, listener])
  }

  on(event: Event_Listen, listener: Listener) {
    return this.addListener(event, listener)
  }

  emit(event: Event_Handle) {
    // 1. Get all listeners of the same event type
    const listenersOfType = this.listeners[event.type]
    if (!listenersOfType) return false

    const listeners = matchListeners(event, Array.from(listenersOfType.values()))

    for (const [listeningEvent, listener] of listeners) {
      const context: ListenerFunctionContext = {
        emitter: this,
        manager: this.manager,
        event,
      }

      logger
        .add(paint.grey(`[`))
        .add(paint.green.dim(`emit`))
        .add(paint.grey(`] ${event.type} `))

      if (event.type === `update:property`) logger.add(paint.white(event.property))
      else if (event.type === `reference:indexed`) logger.add(paint.white(event.reference))

      logger //
        .add(paint.grey(` `))
        .add(paint.blue.bold.dim(listener.id))

      logger.info()

      listener.fn(context)
    }

    return true
  }
}
