import assert from "assert"
import { isEqual } from "lodash"
import { Nilable } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"

import { Reference } from "@december/utils/access"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../object"

export interface ObjectMapOptions {
  skipAliases?: boolean
  skipReferenceEvents?: boolean
}

export default class ObjectMap extends EventEmitter {
  public byID: Map<ObjectID, MutableObject> = new Map()
  protected aliasesByID: Record<ObjectID, ObjectID[]> = {}
  //
  public byAlias: Record<ObjectAlias, ObjectID[]> = {}

  constructor() {
    super()

    this.byID = new Map()
    this.aliasesByID = {}
    //
    this.byAlias = {}
  }

  /** Add new object to map */
  add(object: MutableObject, options: Partial<ObjectMapOptions> = {}) {
    assert(!this.byID.has(object.id), `Object "${object.id}" already exists`)

    // 1. OBJECT ID -> OBJECT
    this.byID.set(object.id, object)
    if (!options.skipReferenceEvents) this.fire(`reference:add`, { reference: new Reference(`id`, object.id), object })

    this.update(object, options)
  }

  /** Update object references in map */
  update(object: MutableObject, options: Partial<ObjectMapOptions> = {}) {
    // 1. Aliases
    if (!options.skipAliases) {
      const currentAliases = this.aliasesByID[object.id] || []
      const newAliases = object.getAliases()

      if (!isEqual(currentAliases, newAliases)) {
        const ADD = newAliases.filter(alias => !currentAliases.includes(alias))
        const REMOVE = currentAliases.filter(alias => !newAliases.includes(alias))

        // 1.1. OBJECT ALIAS -> OBJECT ID
        for (const alias of REMOVE) {
          const index = this.byAlias[alias].indexOf(object.id)
          if (index !== -1) this.byAlias[alias].splice(index, 1)
          if (this.byAlias[alias].length === 0) delete this.byAlias[alias]

          if (!options.skipReferenceEvents) this.fire(`reference:remove`, { reference: new Reference(`alias`, alias), object })
        }

        for (const alias of ADD) {
          if (!this.byAlias[alias]) this.byAlias[alias] = []
          this.byAlias[alias].push(object.id)

          if (!options.skipReferenceEvents) this.fire(`reference:add`, { reference: new Reference(`alias`, alias), object })
        }

        // 1.2. OBJECT ID -> ALIASES
        this.aliasesByID[object.id] = [...currentAliases, ...ADD]

        // Some refernece was changed
        return true
      }
    }

    // no changes in references
    return false
  }

  // has(value: ObjectID | ObjectAlias, type: `id` | `alias` = `id`) {
  //   if (type === `id`) return this.byID.has(value)
  //   if (type === `alias`) return this.hasAlias(value)

  //   throw new Error(`Invalid type "${type}"`)
  // }

  hasID(id: ObjectID) {
    return this.byID.has(id)
  }

  hasAlias(alias: ObjectAlias) {
    return this.byAlias[alias].length > 0
  }

  get(id: ObjectID) {
    return this.byID.get(id)
  }

  getByReference(reference: ObjectReference) {
    let id: ObjectID[] = [reference.value]

    if (reference.type === `id`) {
      // do nothing
    } else if (reference.type === `alias`) {
      const aliases = this.byAlias[reference.value]

      if (aliases.length === 0) throw new Error(`Alias "${id}" not found`)

      id = [...aliases]
    }

    return id.map(id => this.get(id)!)
  }

  getByStrictReference(reference: StrictObjectReference) {
    assert(STRICT_OBJECT_TYPES.includes(reference.type), `Invalid strict reference type "${reference.type}"`)

    return this.getByReference(reference)[0]
  }
}
