import assert from "assert"
import { MaybeUndefined } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"
import { identity, isEqual, isString, sortBy, uniq } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../../logger"
import type ObjectController from ".."
import { ObjectManagerEmitter } from "../manager"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"

import { IntegrityEntry } from "./entry"
import { EventTrace, explainEventTrace, INTEGRITY_ENTRY_ADDED, IntegrityEntryAddedEvent } from "../eventEmitter/event"
import { IntegrityEntryRemovedEvent, IntegrityEntryUpdatedEvent } from "../eventEmitter/event/events/integrityEntry"

export const logger = churchill.child(`compiler`, undefined, { separator: `` })

export type { IntegrityEntry } from "./entry"
export { IntegrityEntryPattern } from "./match"
export type { IntegrityEntryPatternOptions } from "./match"

/**
 * An Object Integrity Registry "registers" and stores all objects for a manager
 */

export default class ObjectIntegrityRegistry extends ObjectManagerEmitter {
  protected _registry: {
    entries: {
      byKey: Map<IntegrityEntry[`key`], IntegrityEntry>
      byObjectID: Map<ObjectID, IntegrityEntry[`key`][]>
    }
    objectIDs: {
      byKey: Map<IntegrityEntry[`key`], ObjectID[]>
    }
  } = {
    entries: { byKey: new Map(), byObjectID: new Map() },
    objectIDs: { byKey: new Map() },
  }

  constructor(controller: ObjectController) {
    super(controller)
  }

  /** Returns if an integrity KEY is already registered (they must be unique) */
  has(entry: IntegrityEntry): boolean
  has(key: IntegrityEntry[`key`]): boolean
  has(entryOrKey: IntegrityEntry | IntegrityEntry[`key`]): boolean {
    const key = typeof entryOrKey === `string` ? entryOrKey : entryOrKey.key
    return this._registry.entries.byKey.has(key)
  }

  /** Returns  */
  hasIndex(entry: IntegrityEntry, objectID: ObjectID): boolean
  hasIndex(key: IntegrityEntry[`key`], objectID: ObjectID): boolean
  hasIndex(entryOrKey: IntegrityEntry | IntegrityEntry[`key`], objectID: ObjectID): boolean {
    const key: IntegrityEntry[`key`] = typeof entryOrKey === `string` ? entryOrKey : entryOrKey.key

    const Key_ObjectIDs = this._registry.objectIDs.byKey.get(key) ?? []
    const ObjectID_Keys = this._registry.entries.byObjectID.get(objectID) ?? []

    const A = Key_ObjectIDs.includes(objectID)
    const B = ObjectID_Keys.includes(key)

    assert((A && !B) || (!A && B), `Integrity index for key "${key}" and object ID "${objectID}" is inconsistent`)

    return A && B
  }

  get(key: IntegrityEntry[`key`]) {
    return this._registry.entries.byKey.get(key)
  }

  /** Adds entry to registry */
  add(entry: IntegrityEntry, trace: EventTrace): IntegrityEntry {
    assert(!this.has(entry), `Integrity entry with key "${entry.key}" already exists`)

    // 1. KEY -> ENTRY
    this._registry.entries.byKey.set(entry.key, entry)

    const event: IntegrityEntryAddedEvent = {
      trace,
      type: `integrity_entry:added`,
      entry,
    }

    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.blue.dim(`integrity/`), paint.blue(`add`), `]`)).add(` `)
      logger.add(paint.white.dim(entry.key), paint.grey.dim(`: `), paint.white(entry.value)).add(` `)
      logger.add(...explainEventTrace(trace))
      logger.info()
    }

    this.fire(event.type, event)
    this.controller.eventEmitter.emit(event)

    return entry
  }

  /** Index Entry against objects (returning if something was changed in the registry) */
  index(entry: IntegrityEntry, objectID: ObjectID, trace: EventTrace): boolean
  index(key: IntegrityEntry[`key`], objectID: ObjectID, trace: EventTrace): boolean
  index(entryOrKey: IntegrityEntry | IntegrityEntry[`key`], objectID: ObjectID, trace: EventTrace): boolean {
    const key: IntegrityEntry[`key`] = typeof entryOrKey === `string` ? entryOrKey : entryOrKey.key
    assert(this.has(key), `Integrity entry with key "${key}" does not exist`)

    if (this.hasIndex(key, objectID)) return false

    // 2. KEY -> OBJECT ID
    const objectIDs = this._registry.objectIDs.byKey.get(key) ?? []
    this._registry.objectIDs.byKey.set(key, sortBy(uniq([...objectIDs, objectID])))

    // 3. OBJECT ID -> KEY
    const entries = this._registry.entries.byObjectID.get(objectID) ?? []
    this._registry.entries.byObjectID.set(key, sortBy(uniq([...entries, key])))

    return true
  }

  /** Updates entry in registry */
  update(entry: IntegrityEntry, trace: EventTrace): boolean {
    assert(this.has(entry), `Integrity entry with key "${entry.key}" does not exist`)

    const previousValue = this.get(entry.key)!.value
    if (isEqual(previousValue, entry.value)) return false

    // 1. KEY -> ENTRY
    this._registry.entries.byKey.set(entry.key, entry)

    const event: IntegrityEntryUpdatedEvent = {
      trace,
      type: `integrity_entry:updated`,
      entry,
      previousValue,
    }

    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.blue.dim(`integrity/`), paint.blue(`update`), `]`)).add(` `)
      logger.add(paint.white.dim(entry.key), paint.grey.dim(`: `), paint.white(previousValue), paint.grey.dim(` -> `), paint.white.bold(entry.value)).add(` `)
      logger.add(...explainEventTrace(trace))
      logger.info()
    }

    this.fire(event.type, event)
    this.controller.eventEmitter.emit(event)

    return true
  }

  /** Upserts entry, returning if there was any change to registry */
  upsert(entry: IntegrityEntry, trace: EventTrace): boolean {
    const alreadyExists = this.has(entry)

    if (alreadyExists) return this.update(entry, trace)

    this.add(entry, trace)
    return true
  }

  /** Removes entry from registry */
  remove(entry: IntegrityEntry, trace: EventTrace): boolean
  remove(entryKey: IntegrityEntry[`key`], trace: EventTrace): boolean
  remove(entryOrKey: IntegrityEntry | IntegrityEntry[`key`], trace: EventTrace): boolean {
    const key: IntegrityEntry[`key`] = typeof entryOrKey === `string` ? entryOrKey : entryOrKey.key
    assert(this.has(key), `Integrity entry with key "${key}" does not exist`)

    const entry = this.get(key)!

    // 1. KEY -> ENTRY
    this._registry.entries.byKey.delete(key)

    // 2. KEY -> OBJECT ID
    const objectIDs = this._registry.objectIDs.byKey.get(key) ?? []
    this._registry.objectIDs.byKey.delete(key)

    // 3. OBJECT ID -> KEY
    for (const objectID of objectIDs) {
      const entries = this._registry.entries.byObjectID.get(objectID) ?? []
      const newEntries = entries.filter(e => e !== key)
      this._registry.entries.byObjectID.set(key, newEntries)
    }

    const event: IntegrityEntryRemovedEvent = {
      trace,
      type: `integrity_entry:removed`,
      entry,
    }

    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.blue.dim(`integrity/`), paint.blue(`remove`), `]`)).add(` `)
      logger.add(paint.white.dim(entry.key), paint.grey.dim(`: `), paint.white(entry.value)).add(` `)
      logger.add(...explainEventTrace(trace))
      logger.info()
    }

    this.fire(event.type, event)
    this.controller.eventEmitter.emit(event)

    return true
  }

  /** Removes all entries tied to an objectID, returning if there was any change to the registry */
  removeByObjectID(objectID: ObjectID, trace: EventTrace): boolean {
    const entries = this._registry.entries.byObjectID.get(objectID) ?? []
    if (!entries.length) return false

    for (const key of entries) this.remove(key, trace)

    return true
  }
}
