import assert from "assert"
import { MaybeUndefined } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"
import { identity, isEqual, isString, orderBy, sortBy, uniq } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../../logger"
import type ObjectController from ".."
import { ObjectManagerEmitter } from "../manager"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"

import { EventTrace, explainEventTrace, INTEGRITY_ENTRY_ADDED, IntegrityEntryAddedEvent } from "../eventEmitter/event"
import { IntegrityEntryRemovedEvent, IntegrityEntryUpdatedEvent } from "../eventEmitter/event/events/integrityEntry"
import { IntegrityEntry } from "../integrityRegistry"

export const logger = churchill.child(`compiler`, undefined, { separator: `` })

/**
 * Register dependencies between objects
 */

export default class ObjectDependencyGraph extends ObjectManagerEmitter {
  // protected graph: Record<ObjectID, Record<IntegrityEntry[`key`], { reference: ObjectReference; key: string }[]>> = {}
  protected entries: {
    byIDAndIntegrityEntry: Record<ObjectID, Record<IntegrityEntry[`key`], { reference: ObjectReference; key: string }[]>>
    byIntegrityEntry: Record<IntegrityEntry[`key`], ObjectID[]>
    byReference: Record<string, { reference: ObjectReference; ids: ObjectID[] }> // ObjectReference.toString() => ObjectID[]
  }

  constructor(controller: ObjectController) {
    super(controller)

    this.entries = {
      byIDAndIntegrityEntry: {},
      byIntegrityEntry: {},
      byReference: {},
    }
  }

  override listen() {
    // when an integrity entry is updated or remove, check if some dependency links should GO
    this.controller.integrityRegistry.on(`integrity_entry:updated`, ({ data }: { data: IntegrityEntryUpdatedEvent }) => {
      this._onIntegrityEntryChanged(data)
    })

    this.controller.integrityRegistry.on(`integrity_entry:removed`, ({ data }: { data: IntegrityEntryRemovedEvent }) => {
      this._onIntegrityEntryChanged(data)
    })

    // TODO: when an object is removed, check if some dependency links should GO
  }

  /** Handles any changes on integrity entries (basically checks if some listeners should be killed of) */
  protected _onIntegrityEntryChanged(event: IntegrityEntryUpdatedEvent | IntegrityEntryRemovedEvent) {
    const wasRemoved = event.type === `integrity_entry:removed`
    const entry = event.entry

    const objects = this.entries.byIntegrityEntry[entry.key] ?? []
    for (const id of objects) {
      const references = this.entries[id][entry.key] ?? []

      debugger // TODO: Implement this
    }
  }

  public add({ id, objects, integrityEntry }: DependencyEntry) {
    let updatedSomething = false

    // 1. Register references by ID and INTEGRITY ENTRY
    this.entries.byIDAndIntegrityEntry[id] ??= {}
    this.entries.byIDAndIntegrityEntry[id][integrityEntry.key] ??= []

    const existingReferences = this.entries.byIDAndIntegrityEntry[id][integrityEntry.key].map(({ key }) => key)
    const keyedReferences = objects.map(reference => ({ reference, key: reference.toString() }))
    const newReferences = keyedReferences.filter(({ key }) => !existingReferences.includes(key))

    this.entries.byIDAndIntegrityEntry[id][integrityEntry.key].push(...newReferences)
    updatedSomething = updatedSomething || newReferences.length > 0

    // 2. Register OBJECT to INTEGRITY ENTRY
    this.entries.byIntegrityEntry[integrityEntry.key] ??= []

    if (!this.entries.byIntegrityEntry[integrityEntry.key].includes(id)) this.entries.byIntegrityEntry[integrityEntry.key].push(id)
    else updatedSomething = true

    // 3. Register REFERENCE to OBJECT
    for (const { reference, key } of keyedReferences) {
      const flatReference = reference.toString()
      this.entries.byReference[flatReference] ??= { reference, ids: [] }
      this.entries.byReference[flatReference].ids.push(id)
    }

    // DEBUG
    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.blue.dim(`dependency/`), paint.blue(`add`), `]`)).add(` `)
      logger.add(paint.white.dim.italic(id), paint.grey.dim(` ->`)).add(` `)

      for (const [i, { reference, key }] of newReferences.entries()) {
        logger.add(paint.white.dim(reference.value))
        if (i < newReferences.length - 1) logger.add(`, `)
      }

      logger.add(` `).add(paint.dim.grey.italic(integrityEntry.key))

      logger.info()
    }

    return updatedSomething
  }

  public getPriorityByObjectID(): Record<ObjectID, number> {
    // 1. Consolidate existing references
    let dependsByID = new Map<ObjectID, ObjectID[]>()
    let dependantsByID = new Map<ObjectID, ObjectID[]>()
    for (const [id, entriesByIntegrity] of Object.entries(this.entries.byIDAndIntegrityEntry)) {
      for (const [, references] of Object.entries(entriesByIntegrity)) {
        for (const { reference } of references) {
          const referencedObjects = this.controller.store.getByReference(reference, false)
          assert(referencedObjects.length <= 1, `Multiple objects found for reference`)
          const [referencedObject] = referencedObjects

          if (!referencedObject) continue

          const list = dependantsByID.get(referencedObject.id) ?? []
          if (list.includes(id)) continue

          list.push(id)
          dependantsByID.set(referencedObject.id, list)

          const list2 = dependsByID.get(id) ?? []
          if (list2.includes(referencedObject.id)) continue

          list2.push(referencedObject.id)
          dependsByID.set(id, list2)
        }
      }
    }

    // 2. Visit "nodes" by topological order
    const order: ObjectID[] = []
    const visited = new Set<ObjectID>()

    function visit(objectID: ObjectID) {
      if (visited.has(objectID)) return

      visited.add(objectID)
      const dependantObjects = dependantsByID.get(objectID) ?? []
      for (const object of dependantObjects) visit(object)
      order.push(objectID)
    }

    for (const [id] of dependantsByID) visit(id)

    const ascOrder = order.reverse()

    // 3. Return topological order as dictionary
    return Object.fromEntries(ascOrder.map((id, index) => [id, index]))
  }

  public print() {
    for (const [id, entriesByIntegrity] of Object.entries(this.entries.byIDAndIntegrityEntry)) {
      logger.add(paint.identity(id)).add(` `)

      const total = Object.values(entriesByIntegrity).reduce((acc, { length }) => acc + length, 0)
      logger.add(paint.grey.dim(`(`)).add(paint.grey(total)).add(paint.grey.dim(`)`)).add(` `)

      let i = 0
      for (const [integrityKey, references] of Object.entries(entriesByIntegrity)) {
        for (const reference of references) {
          logger.add(paint.dim(reference.reference.value))
          i++

          if (i < total) logger.add(paint.grey.dim(`, `))
        }
      }

      logger.debug()
    }

    logger.add(paint.grey.dim(`==============================================================================================================================================`)).debug()
    logger.add(paint.grey.dim(`==============================================================================================================================================`)).debug()

    const referencesByCount = orderBy(Object.entries(this.entries.byReference), ([, { ids }]) => ids.length, `desc`)

    for (const [flatReference, { reference, ids }] of referencesByCount) {
      const objects = this.controller.store.getByReference(reference, false)
      assert(objects.length <= 1, `Multiple objects found for reference`)
      const [object] = objects

      logger.add(paint.grey.dim.italic(flatReference)).add(` `)
      if (!object) logger.add(paint.red.dim(`<NOT FOUND>`)).add(` `)
      else logger.add(paint.green(object.id)).add(` `)

      const total = ids.length
      logger.add(paint.grey.dim(`(`)).add(paint.grey(total)).add(paint.grey.dim(`)`)).add(` `)

      let i = 0
      for (const id of ids) {
        logger.add(paint.dim(id))
        i++

        if (i < total) logger.add(paint.grey.dim(`, `))
      }

      logger.debug()
    }

    logger.add(paint.grey.dim(`==============================================================================================================================================`)).debug()
    logger.add(paint.grey.dim(`==============================================================================================================================================`)).debug()

    // 1. Consolidate existing references
    let dependsByID = new Map<ObjectID, ObjectID[]>()
    let dependantsByID = new Map<ObjectID, ObjectID[]>()
    for (const [id, entriesByIntegrity] of Object.entries(this.entries.byIDAndIntegrityEntry)) {
      for (const [, references] of Object.entries(entriesByIntegrity)) {
        for (const { reference } of references) {
          const referencedObjects = this.controller.store.getByReference(reference, false)
          assert(referencedObjects.length <= 1, `Multiple objects found for reference`)
          const [referencedObject] = referencedObjects

          if (!referencedObject) continue

          const list = dependantsByID.get(referencedObject.id) ?? []
          if (list.includes(id)) continue

          list.push(id)
          dependantsByID.set(referencedObject.id, list)

          const list2 = dependsByID.get(id) ?? []
          if (list2.includes(referencedObject.id)) continue

          list2.push(referencedObject.id)
          dependsByID.set(id, list2)
        }
      }
    }

    // dependantsByID = new Map<ObjectID, ObjectID[]>()
    // dependantsByID.set(`3`, [`1`])
    // dependantsByID.set(`1`, [`2`, `3`])
    // dependantsByID.set(`2`, [`3`])

    const order: ObjectID[] = []
    const visited = new Set<ObjectID>()
    const circularDependencies: Record<ObjectID, ObjectID[]> = {}

    const self = this
    function visit(objectID: ObjectID, sourceObjectID: ObjectID | null) {
      if (visited.has(objectID)) {
        if (sourceObjectID) {
          circularDependencies[objectID] ??= []
          if (!circularDependencies[objectID].includes(sourceObjectID)) circularDependencies[objectID].push(sourceObjectID)
        }

        return
      }

      visited.add(objectID)
      const dependantObjects = dependantsByID.get(objectID) ?? []
      for (const object of dependantObjects) visit(object, objectID)
      order.push(objectID)
    }

    for (const [id] of dependantsByID) visit(id, null)

    const ascOrder = order.reverse()

    for (const [index, id] of ascOrder.entries()) {
      logger.add(paint.blue(`#${index}`)).add(` `)

      logger.add(paint.identity(id)).add(` `)

      const circles = circularDependencies[id] ?? []
      if (circles.length > 0) {
        logger.add(paint.yellow.bold.dim(`{`))
        logger.add(paint.yellow.bold.dim(`CIRCULAR`)).add(` `)

        for (const [i, id] of circles.entries()) {
          const order = ascOrder.indexOf(id)

          const color = order === index ? paint.yellow.bold : order < index ? paint.red : paint.green
          logger.add(color.dim(id))
          logger.add(paint.gray.dim(` (#${order})`))

          if (i < circles.length) logger.add(paint.grey.dim(`, `))
        }

        logger.add(paint.yellow.bold.dim(`}`)).add(` `)
      }

      const depends = dependsByID.get(id) ?? []
      if (depends.length > 0) {
        logger.add(paint.grey.dim(`{<- `))

        logger.add(paint.grey.dim(`(`)).add(paint.grey.italic(depends.length)).add(paint.grey.dim(`)`)).add(` `)

        let i = 0
        for (const id of depends) {
          const order = ascOrder.indexOf(id)

          const color = order < index ? paint.red : paint.green.bold
          logger.add(color.dim(id))
          logger.add(paint.gray.dim(` (#${order})`))
          i++

          if (i < depends.length) logger.add(paint.grey.dim(`, `))
        }

        logger.add(paint.grey.dim(`}`)).add(` `)
      }

      const dependants = dependantsByID.get(id) ?? []
      logger.add(paint.grey.dim(`(`)).add(paint.grey(dependants.length)).add(paint.grey.dim(`)`)).add(` `)

      let i = 0
      for (const id of dependants) {
        const order = ascOrder.indexOf(id)

        const color = order < index ? paint.red : paint.green
        logger.add(color.dim(id))
        logger.add(paint.gray.dim(` (#${order})`))
        i++

        if (i < dependants.length) logger.add(paint.grey.dim(`, `))
      }

      logger.debug()
    }

    // debugger
  }
}

export interface DependencyEntry {
  id: ObjectID
  objects: ObjectReference[]
  //
  integrityEntry: IntegrityEntry
}
