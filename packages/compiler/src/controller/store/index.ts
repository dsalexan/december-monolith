import type ObjectController from ".."
import { ObjectManagerEmitter } from "../manager"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"
import { Reference } from "@december/utils/access"
import assert from "assert"
import { MaybeUndefined } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"
import { identity, isEqual, sortBy } from "lodash"

export interface ObjectStoreAddOptions {
  skipAliases?: boolean
  skipReferenceEvents?: boolean
}

export const OBJECT_STORE_EVENTS = [`reference:added`, `reference:removed`] as const
export type ObjectStoreEvent = (typeof OBJECT_STORE_EVENTS)[number]

/**
 * An Object Store registers and stores all objects for a manager
 */

export default class ObjectStore extends ObjectManagerEmitter {
  protected _storage: {
    object: {
      byID: Map<ObjectID, MutableObject>
    }
    ids: {
      byAlias: Record<ObjectAlias, ObjectID[]>
    }
    aliases: {
      byID: Record<ObjectID, ObjectAlias[]>
    }
  } = {
    object: { byID: new Map() },
    ids: { byAlias: {} },
    aliases: { byID: {} },
  }

  constructor(controller: ObjectController) {
    super(controller)
  }

  // #region HAS

  public hasReference(reference: ObjectReference) {
    if (reference.type === `id`) return this.hasID(reference.value)
    else if (reference.type === `alias`) return this.hasAlias(reference.value)

    throw new Error(`Invalid reference type "${reference.type}"`)
  }

  public hasObject(object: MutableObject) {
    return this.hasID(object.id)
  }

  public hasID(id: ObjectID) {
    return this._storage.object.byID.has(id)
  }

  public hasAlias(alias: ObjectAlias) {
    return (this._storage.aliases[alias]?.length ?? 0) > 0
  }

  /** Check if object is already stored */
  public has(objectOrIDOrAliasOrReference: MutableObject | ObjectID | ObjectAlias | ObjectReference) {
    if (objectOrIDOrAliasOrReference instanceof MutableObject) return this.hasObject(objectOrIDOrAliasOrReference)
    else if (objectOrIDOrAliasOrReference instanceof Reference) return this.hasReference(objectOrIDOrAliasOrReference)

    const hasID = this.hasID(objectOrIDOrAliasOrReference)
    const hasAlias = this.hasAlias(objectOrIDOrAliasOrReference)

    return hasID || hasAlias
  }

  // #endregion

  // #region GETTERS

  /** Returns all ObjectIDs related to that alias */
  public getObjectIDs(alias: ObjectAlias | ObjectReference | Reference<`id`, ObjectID>): ObjectID[] {
    let targetAlias: string

    if (alias instanceof Reference) {
      assert(alias.type === `alias`, `Invalid reference type "${alias.type}"`)
      targetAlias = alias.value
    } else targetAlias = alias

    return this._storage.ids.byAlias[targetAlias] ?? []
  }

  /** Returns all aliases for an object */
  public getAliases(object: MutableObject | ObjectID | Reference<`id`, ObjectID>): ObjectAlias[] {
    let objectID: string

    if (object instanceof Reference) {
      assert(object.type === `id`, `Invalid reference type "${object.type}"`)
      objectID = object.value
    } else if (object instanceof MutableObject) objectID = object.id
    else objectID = object

    return this._storage.aliases.byID[objectID] ?? []
  }

  /** Returns object by it's ID */
  public getByID(id: ObjectID): MaybeUndefined<MutableObject> {
    return this._storage.object.byID.get(id)
  }

  /** Returns object by it's reference (strict or not) */
  public getByReference(reference: ObjectReference, strict: false | never): MutableObject[]
  public getByReference(reference: StrictObjectReference, strict: true): MaybeUndefined<MutableObject>
  public getByReference(reference: ObjectReference | StrictObjectReference, strict: boolean = false): MaybeUndefined<MutableObject> | MutableObject[] {
    if (strict) assert(STRICT_OBJECT_TYPES.includes(reference.type as any), `Invalid strict reference type "${reference.type}"`)

    let id: ObjectID[] = [reference.value]

    // if (reference.type === `id`) // do nothing
    if (reference.type === `alias`) id = this.getObjectIDs(reference)

    const objects = id.map(id => this.getByID(id)!)

    return strict ? objects[0] : objects
  }

  /** Strictify reference based on indexed objects */
  public strictifyReference(reference: ObjectReference): StrictObjectReference {
    if (STRICT_OBJECT_TYPES.includes(reference.type as any)) return reference as StrictObjectReference
    else if (reference.type === `alias`) {
      const objectIDs = this.getObjectIDs[reference.value]

      assert(objectIDs.length === 1, `Multiple objects found for alias "${reference.value}"`)

      const [objectID] = objectIDs
      return new Reference(`id`, objectID) as StrictObjectReference
    }

    throw new Error(`Unimplemented strictification for reference type "${reference.type}"`)
  }

  // #endregion

  // #region SETTERS

  /** Adds an object to storage */
  public add(object: MutableObject, options: Partial<ObjectStoreAddOptions> = {}): void {
    assert(!this.hasID(object.id), `Object "${object.id}" already exists`)

    // 1. OBJECT ID -> OBJECT
    this._storage.object.byID.set(object.id, object)
    if (!options.skipReferenceEvents) this.fire(`reference:added`, { reference: new Reference(`id`, object.id), object })

    this.update(object, options)
  }

  /** Updates object references in storage, returning if some reference was changed */
  public update(object: MutableObject, options: Partial<ObjectStoreAddOptions> = {}): boolean {
    // 1. ALIASES
    if (!options.skipAliases) {
      const currentAliases = sortBy(this.getAliases(object.id), identity)
      const newAliases = sortBy(object.getAliases(), identity)

      if (!isEqual(currentAliases, newAliases)) {
        const ADD = newAliases.filter(alias => !currentAliases.includes(alias))
        const REMOVE = currentAliases.filter(alias => !newAliases.includes(alias))

        // 1.A. OBJECT ALIAS -> OBJECT ID

        // (i.e. aliases not present in object anymore)
        for (const alias of REMOVE) {
          // Remove objectID indexed alias
          const index = this._storage.ids.byAlias[alias].indexOf(object.id)
          if (index !== -1) this._storage.ids.byAlias[alias].splice(index, 1)
          if (this._storage.ids.byAlias[alias].length === 0) delete this._storage.ids.byAlias[alias]

          // // Remove alias from indexed objectID's
          // const index2 = this._storage.aliases.byID[object.id].indexOf(alias)
          // if (index2 !== -1) this._storage.aliases.byID[object.id].splice(index2, 1)

          if (!options.skipReferenceEvents) this.fire(`reference:removed`, { reference: new Reference(`alias`, alias), object })
        }

        // (i.e. aliases present in object but not in storage)
        for (const alias of ADD) {
          // index alias (-> objectID)
          this._storage.ids.byAlias[alias] ??= []
          this._storage.ids.byAlias[alias].push(object.id)

          // // index objectID (-> alias)
          // this._storage.aliases.byID[object.id] ??= []
          // this._storage.aliases.byID[object.id].push(alias)

          if (!options.skipReferenceEvents) this.fire(`reference:added`, { reference: new Reference(`alias`, alias), object })
        }

        // 1.B. OBJECT ID -> ALIASES
        //    (faster to do it like this)
        this._storage.aliases.byID[object.id] = sortBy([...currentAliases, ...ADD], identity)

        return true // Some reference was changed
      }
    }

    // no changes in references
    return false
  }

  // #endregion
}
