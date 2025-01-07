import assert from "assert"
import { AnyObject, MaybeUndefined, Nullable } from "tsdef"
import { identity, isEqual, isSymbol, sortBy } from "lodash"

import { Reference } from "@december/utils/access"
import { EqualsElementPattern } from "@december/utils/match/element"

import churchill, { Block, paint, Paint } from "../../logger"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"

import type ObjectController from ".."
import { ObjectManager } from "../manager"

import { Event, EventDispatcher, explainEvent, explainTargetEvent, matchEventToTargets, TargetEvent } from "./event"
import { Listener, ListenerCallback, ListenerCallbackMetadata } from "./listener"
import { IntegrityEntry } from "../integrityRegistry"
import { IntegrityEntryRemovedEvent, IntegrityEntryUpdatedEvent } from "./event/events/integrityEntry"
export { makeArtificialEventTrace } from "./event"

export const logger = churchill.child(`compiler`, undefined, { separator: `` })

export const MAX_LISTENERS_BY_INDEX = 50

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
    byPropertyUpdatedEvent: Record<string, Record<string, Listener[`id`][]>> // type -> object (aka reference.value) -> listener[]
    byIntegrityKey: Record<IntegrityEntry[`key`], Listener[`id`][]>
  } = {
    byID: new Map(),
    byEvent: {} as any,
    byPropertyUpdatedEvent: {} as any,
    byIntegrityKey: {} as any,
  }

  constructor(controller: ObjectController) {
    super(controller)
    // this.__DEBUG = false
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

    // if (this.__DEBUG) {
    //   logger.add(...paint.grey(`[`, paint.cyan.dim(`listen`), `] ${listener.targetEvent.type} `))
    //   logger.add(...explainTargetEvent(listener.targetEvent))
    //   logger.add(paint.cyan.bold.dim(listener.id))

    //   if (listener.integrityEntries) logger.add(paint.grey.dim(` {${listener.integrityEntries.map(e => `${e.key}, ${e.value}`).join(`, `)}}`))

    //   logger.debug()
    // }

    // 1. ID -> LISTENER
    this.listeners.byID.set(listener.id, listener)

    // 2. EVENT -> LISTENER IDs
    const eventType = listener.targetEvent.type

    // A. BY_EVENT INDEX
    if (eventType !== `property:updated`) {
      this.listeners.byEvent[eventType] ??= []
      assert(this.listeners.byEvent[eventType].includes(listener.id) === false, `Listener "${listener.id}" already exists for event "${eventType}"`)
      this.listeners.byEvent[eventType].push(listener.id)
      assert(this.listeners.byEvent[eventType].length < MAX_LISTENERS_BY_INDEX, `Too many listeners for event "${eventType}", create a new index`)
    }
    // B. BY_PROPERTY_UPDATED_EVENT INDEX
    else {
      const properties = listener.targetEvent.properties
      for (const { referencePattern, propertyPattern } of properties) {
        assert(!isSymbol(referencePattern), `Club cant handle`)

        const typePattern = referencePattern.typePattern
        assert(EqualsElementPattern.isEqualsElementPattern(typePattern), `Unimplemented`)
        this.listeners.byPropertyUpdatedEvent[typePattern.element] ??= {}

        const objectPattern = referencePattern.valuePattern
        assert(EqualsElementPattern.isEqualsElementPattern(objectPattern), `Unimplemented`)
        const list = (this.listeners.byPropertyUpdatedEvent[typePattern.element][objectPattern.element] ??= [])

        // assert(list.includes(listener.id) === false, `Listener "${listener.id}" already exists for propertyUpdatedEvent "${typePattern.element} -> ${objectPattern.element}"`)
        list.push(listener.id)
        assert(list.length < MAX_LISTENERS_BY_INDEX, `Too many listeners for propertyUpdatedEvent "${typePattern.element} -> ${objectPattern.element}", create a new index `)
      }
    }

    // 3. INTEGRITY ENTRY -> LISTENER IDs
    if (listener.integrityEntries) {
      for (const entry of listener.integrityEntries) {
        this.listeners.byIntegrityKey[entry.key] ??= []
        assert(this.listeners.byIntegrityKey[entry.key].includes(listener.id) === false, `Listener "${listener.id}" already exists for integirty key "${entry.key}"`)
        this.listeners.byIntegrityKey[entry.key].push(listener.id)
        assert(this.listeners.byIntegrityKey[entry.key].length < MAX_LISTENERS_BY_INDEX, `Too many listeners for integrity key "${entry.key}", create a new index `)
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
    debugger
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
    let listenersOfType: Listener[]

    if (event.type !== `property:updated`) listenersOfType = this.listeners.byEvent[event.type]?.map((id: string) => this.get(id)!) ?? []
    else {
      const { type, value: object } = event.property.object
      const property = event.property.property

      listenersOfType = this.listeners.byPropertyUpdatedEvent[type]?.[object]?.map((id: string) => this.get(id)!) ?? []
    }

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
