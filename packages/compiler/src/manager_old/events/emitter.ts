import assert from "assert"
import { get } from "lodash"
import { EventEmitter } from "@billjs/event-emitter"

import { Reference } from "@december/utils/access"

import type MutableObject from "../../object"

import type ObjectManager from ".."
import { Event_Handle, Event_Listen, EventDispatched, EventTrace, EventType, matchListeners, ReferenceIndexedEvent_Handle, UpdatePropertyEvent_Handle, UpdatePropertyEvent_Listen } from "./events"

import churchill, { Block, paint, Paint } from "../../logger"
import { Signature, SignatureReference } from "./signature"
import { ObjectID } from "../../object"

export const logger = churchill.child(`node`, undefined, { separator: `` })

export type ListenerID = string

export interface ListenerFunctionContext<TEventHandle extends Event_Handle = Event_Handle, TEventListen extends Event_Listen = Event_Listen> {
  emitter: ObjectEventEmitter
  manager: ObjectManager
  event: EventDispatched<TEventHandle, TEventListen>
  listenerID: ListenerID
  data: Record<string, any>
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
  protected signatures: Record<ObjectID, Record<string, string>> = {} // ObjectID -> SignatureName -> Value
  protected listenersBySignature: Record<string, [EventType, ListenerID][]> = {} // (ObjectID, SignatureName) -> (EventType, ListenerID)[]

  constructor(manager: ObjectManager) {
    this.manager = manager
  }

  addListener(event: Event_Listen, listener: Listener) {
    this.listeners[event.type] ??= new Map()

    const listeners = this.listeners[event.type]

    assert(!listeners.has(listener.id), `Listener "${listener.id}" already exists`)

    logger
      .add(paint.grey(`[`))
      .add(paint.blue.dim(`listen`))
      .add(paint.grey(`] ${event.type} `))

    if (event.type === `update:property`) logger.add(paint.white(event.properties.join(`, `)))
    else if (event.type === `reference:indexed`) logger.add(paint.white(event.references.join(`, `)))
    else if (event.type === `signature:updated`) logger.add(paint.white(event.signatures.join(`, `)))
    else throw new Error(`Unimplemented event type "${event.type}"`)

    logger //
      .add(paint.grey(` `))
      .add(paint.blue.bold.dim(listener.id))

    // if (event.signature) logger.add(` `).add(paint.grey.italic.dim(event.signature.value.name))

    logger.info()

    listeners.set(listener.id, [event, listener])

    // // Index by signature
    // if (event.signature) {
    //   const signatureID = `${event.signature.value.objectID}::${event.signature.value.name}`
    //   this.listenersBySignature[signatureID] ??= []
    //   this.listenersBySignature[signatureID].push([event.type as any, listener.id])
    // }
  }

  on(event: Event_Listen, listener: Listener) {
    return this.addListener(event, listener)
  }

  off(event: EventType, listenerID: ListenerID) {
    const listenersOfType = this.listeners[event]
    if (!listenersOfType) return false

    const listener = listenersOfType.get(listenerID)
    if (!listener) return false

    listenersOfType.delete(listenerID)

    logger
      .add(paint.grey(`[`))
      .add(paint.blue.dim(`unlisten`))
      .add(paint.grey(`] ${event} `))

    if (listener[0].type === `update:property`) logger.add(paint.white(listener[0].properties.join(`, `)))
    else if (listener[0].type === `reference:indexed`) logger.add(paint.white(listener[0].references.join(`, `)))
    else if (listener[0].type === `signature:updated`) logger.add(paint.white(listener[0].signatures.join(`, `)))
    else throw new Error(`Unimplemented event type "${event}"`)

    logger //
      .add(paint.grey(` `))
      .add(paint.blue.bold.dim(listenerID))

    logger.info()

    // // Remove from signature index
    // if (listener[0].signature) {
    //   const signatureID = `${listener[0].signature.value.objectID}::${listener[0].signature.value.name}`
    //   const listeners = this.listenersBySignature[signatureID]

    //   const index = listeners.findIndex(([eventType, id]) => eventType === event && id === listenerID)
    //   if (index !== -1) listeners.splice(index, 1)
    // }

    return true
  }

  emit(event: Event_Handle) {
    // 1. Get all listeners of the same event type
    const listenersOfType = this.listeners[event.type]
    if (!listenersOfType) return false

    const listeners = matchListeners(event as Event_Handle, Array.from(listenersOfType.values()))

    for (const [listeningEvent, listener] of listeners) {
      const context: ListenerFunctionContext = {
        emitter: this,
        manager: this.manager,
        event: { ...event, dispatcher: listeningEvent },
        listenerID: listener.id,
        data: listeningEvent.data ?? {},
      }

      logger
        .add(paint.grey(`[`))
        .add(paint.green.dim(`emit`))
        .add(paint.grey(`] ${event.type} `))

      if (event.type === `update:property`) logger.add(paint.white(event.property))
      else if (event.type === `reference:indexed`) logger.add(paint.white(event.reference))
      else if (event.type === `signature:added`)
        logger
          .add(paint.grey.dim(`(`))
          .add(paint.white(event.signature.value.id))
          .add(paint.grey.dim(`)`))
          .add(paint.grey.dim(` "`))
          .add(paint.grey(`${event.signature.value.value}`))
          .add(paint.grey.dim(`"`))
      else if (event.type === `signature:updated`)
        logger
          .add(paint.grey(`(`))
          .add(paint.white(event.id)) //
          .add(paint.grey(`)`))
          .add(paint.grey.dim(` "`))
          .add(paint.grey(event.oldValue))
          .add(paint.grey.dim(`"`))
          .add(paint.grey.dim(` -> `))
          .add(paint.grey.dim(`"`))
          .add(paint.white(event.value))
          .add(paint.grey.dim(`"`))

      logger //
        .add(paint.grey(` `))
        .add(paint.blue.bold.dim(listener.id))

      logger.info()

      listener.fn(context)
    }

    return true
  }

  handleSignatures(object: MutableObject, trace: EventTrace) {
    const indexedSignatures = this.signatures[object.id] ?? {}
    const signatures = (get(object.data, Signature.basePath) as Record<string, string>) ?? {}

    // 1. Index new signatures
    for (const [name, value] of Object.entries(signatures)) {
      const reference = Signature.reference(Signature.id(object.id, name), value)

      if (indexedSignatures[name]) {
        // signature is already indexed

        // 2. Check if values are the same
        const valuesMatch = indexedSignatures[name] === value
        if (!valuesMatch) {
          // 3. If values don't match, signature has changed. Warn all listeners

          const oldValue = indexedSignatures[name]
          this.signatures[object.id][name] = value

          this.emit({ type: `signature:updated`, id: reference.value.id, value, oldValue, trace })
          // this.onSignatureUpdated(reference)
        }
      } else {
        // new signature

        this.signatures[object.id] ??= {}
        this.signatures[object.id][name] = value

        this.emit({ type: `signature:added`, signature: reference, trace })
      }
    }

    // 2. Check removed signatures
    for (const [name, value] of Object.entries(indexedSignatures)) {
      const id = Signature.id(object.id, name)
      const reference = Signature.reference(id, value)

      if (!signatures[name]) {
        // signature was removed
        this.emit({ type: `signature:updated`, id, oldValue: value, value: undefined, trace })
        // this.onSignatureUpdated(reference, true)
      }
    }
  }
}
