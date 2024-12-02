import { IntegrityEntryRemovedEvent, IntegrityEntryUpdatedEvent } from "./event/events/integrityEntry"
import assert from "assert"
import { AnyObject, MaybeUndefined, Nullable } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"
import { identity, isEqual, sortBy } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../../logger"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"

import type ObjectController from ".."
import { ObjectManager } from "../manager"

import { Event, EventDispatcher, explainEvent, explainTargetEvent, matchEventToTargets, TargetEvent } from "./event"
import { Listener, ListenerCallback, ListenerCallbackMetadata } from "./listener"
import { IntegrityEntry } from "../integrityRegistry"

export { makeArtificialEventTrace } from "./event"
export const logger = churchill.child(`compiler`, undefined, { separator: `` })

export interface ObjectStoreAddOptions {
  skipAliases?: boolean
  skipReferenceEvents?: boolean
}

/**
 * An Object Event Emitter registers, listen and emit events around the controller
 */

export default class ObjectEventEmitter extends ObjectManager {
  protected listeners: {
    byID: Map<Listener[`id`], Listener>
    byEvent: Record<TargetEvent[`type`], Listener[`id`][]>
    byIntegrityKey: Record<IntegrityEntry[`key`], Listener[`id`][]>
  } = {
    byID: new Map(),
    byEvent: {} as any,
    byIntegrityKey: {} as any,
  }

  constructor(controller: ObjectController) {
    super(controller)
  }

  override listen() {
    // when a integrity entry is updated or removed, check if some listeners should GO
    this.controller.integrityRegistry.on(`integrity_entry:updated`, ({ data }: { data: IntegrityEntryUpdatedEvent }) => {
      this._onIntegrityEntryChanged(data)
    })

    this.controller.integrityRegistry.on(`integrity_entry:removed`, ({ data }: { data: IntegrityEntryRemovedEvent }) => {
      this._onIntegrityEntryChanged(data)
    })

    // TODO: Maybe add an "onObjectRemoved" ???
  }

  /** Handles any changes on integrity entries (basically checks if some listeners should be killed of) */
  protected _onIntegrityEntryChanged(event: IntegrityEntryUpdatedEvent | IntegrityEntryRemovedEvent) {
    const wasRemoved = event.type === `integrity_entry:removed`
    const entry = event.entry

    const listeners = this.listeners.byIntegrityKey[entry.key] ?? []
    for (const listenerID of listeners) {
      const listener = this.get(listenerID)
      assert(listener, `Listener "${listenerID}" doesn't exist`)

      let shouldRemoveListener = false

      // 1. If integrity entry was removed, remove listener too
      if (wasRemoved) shouldRemoveListener = true
      // 2. Check if integrity entry's value is different than listener's version
      else {
        const listenerEntry = listener.integrityEntries?.find(e => e.key === entry.key)
        assert(listenerEntry, `Listener "${listenerID}" is missing integrity entry for "${entry.key}"`)

        const expectedValue = listenerEntry.value
        // 2.A. Values don't match, remove listener
        shouldRemoveListener = expectedValue === entry.value
      }

      // 3. Remove listener
      if (shouldRemoveListener) this.removeListener(listenerID)
    }
  }

  has(id: string): boolean {
    return this.listeners.byID.has(id)
  }

  get(id: string): MaybeUndefined<Listener> {
    return this.listeners.byID.get(id)
  }

  addListener(listener: Listener): boolean
  addListener(id: string, targetEvent: TargetEvent, callback: ListenerCallback, integrityEntries?: IntegrityEntry[]): boolean
  addListener(listenerOrID: Listener | string, targetEvent?: TargetEvent, callback?: ListenerCallback, integrityEntries?: IntegrityEntry[]): boolean {
    let listener: Listener

    // handle args
    if (callback === undefined || targetEvent === undefined) listener = listenerOrID as Listener
    else
      listener = {
        id: listenerOrID as string,
        targetEvent,
        callback,
        integrityEntries,
      }

    assert(!this.has(listener.id), `Listener "${listener.id}" already exists`)

    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.cyan.dim(`listen`), `] ${listener.targetEvent.type} `))
      logger.add(...explainTargetEvent(listener.targetEvent))
      logger.add(paint.cyan.bold.dim(listener.id))

      if (listener.integrityEntries) logger.add(paint.grey.dim(` {${listener.integrityEntries.map(e => `${e.key}, ${e.value}`).join(`, `)}}`))

      logger.debug()
    }

    // 1. ID -> LISTENER
    this.listeners.byID.set(listener.id, listener)

    // 2. EVENT -> LISTENER IDs
    this.listeners.byEvent[listener.targetEvent.type] ??= []
    assert(this.listeners.byEvent[listener.targetEvent.type].includes(listener.id) === false, `Listener "${listener.id}" already exists for event "${listener.targetEvent.type}"`)
    this.listeners.byEvent[listener.targetEvent.type].push(listener.id)

    // 3. INTEGRITY ENTRY -> LISTENER IDs
    if (listener.integrityEntries) {
      for (const entry of listener.integrityEntries) {
        this.listeners.byIntegrityKey[entry.key] ??= []
        assert(this.listeners.byIntegrityKey[entry.key].includes(listener.id) === false, `Listener "${listener.id}" already exists for integirty key "${entry.key}"`)
        this.listeners.byIntegrityKey[entry.key].push(listener.id)
      }
    }

    return true
  }

  removeListener(listenerID: Listener[`id`]): boolean {
    if (!this.has(listenerID)) return false

    const listener = this.get(listenerID)!

    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.cyan.dim(`unlisten`), `] ${listener.targetEvent.type} `))
      logger.add(...explainTargetEvent(listener.targetEvent))
      logger.add(paint.cyan.bold.dim(listener.id))

      if (listener.integrityEntries) logger.add(paint.grey.dim(` {${listener.integrityEntries.map(e => `${e.key}, ${e.value}`).join(`, `)}}`))

      logger.info()
    }

    // 1. ID -> LISTENER
    this.listeners.byID.delete(listenerID)

    // 2. EVENT -> LISTENER IDs
    if (this.listeners.byEvent[listener.targetEvent.type]) this.listeners.byEvent[listener.targetEvent.type] = this.listeners.byEvent[listener.targetEvent.type].filter(id => id !== listenerID)

    // 3. INTEGRITY ENTRY -> LISTENER IDs
    if (listener.integrityEntries) {
      for (const entry of listener.integrityEntries) {
        if (this.listeners.byIntegrityKey[entry.key]) this.listeners.byIntegrityKey[entry.key] = this.listeners.byIntegrityKey[entry.key].filter(id => id !== listenerID)
      }
    }

    return true
  }

  /** Call callback listening to a event. Not responsible for queueing. */
  emit(event: Event) {
    const listenersOfType: Listener[] = this.listeners.byEvent[event.type]?.map((id: string) => this.get(id)!) ?? []
    if (listenersOfType.length === 0) return []

    const listeners = matchEventToTargets(event, listenersOfType)
    for (const { targetable: listener, matches } of listeners) {
      const { id, targetEvent, callback } = listener

      const eventDispatcher: EventDispatcher<Event, TargetEvent> = { ...event, dispatcher: targetEvent, matches }
      const callbackMetadata: ListenerCallbackMetadata = {
        listener,
        eventEmitter: this,
      }

      if (this.__DEBUG) {
        logger.add(...paint.grey(`[`, paint.cyan.dim(`emit`), `] ${listener.targetEvent.type}`)).add(` `)
        logger.add(...explainEvent(event, { eventEmitter: this })).add(` `)
        logger.add(paint.cyan.bold.dim(listener.id))

        if (listener.integrityEntries) logger.add(paint.grey.dim(` {${listener.integrityEntries.map(e => `${e.key}, ${e.value}`).join(`, `)}}`))

        logger.info()
      }

      if (listener.id === `11178::property:updated::7594cfc8`) debugger

      callback(eventDispatcher, callbackMetadata)
    }
  }
}
