import { EventEmitter } from "@billjs/event-emitter"

import { ANY_PROPERTY, PropertyReference, Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../logger"

import ObjectMutator from "./mutator"
import MutableObject, { ObjectAlias, ObjectID, ObjectReference, ObjectUpdateEventData, MUTABLE_OBJECT_RANDOM_ID, StrictObjectReference, STRICT_OBJECT_TYPES, UniqueObjectReference } from "../object"
import ObjectMap from "./map"
// import { MutationInstruction } from "../mutation"
import { zip } from "lodash"
import ObjectEventEmitter from "./events/emitter"
import { Strategy } from "../strategy"
import assert from "assert"

export type ObjectPropertyReference = PropertyReference<ObjectReference>
export type UniqueObjectPropertyReference = PropertyReference<UniqueObjectReference>
export type StrictObjectPropertyReference = PropertyReference<StrictObjectReference>

export default class ObjectManager extends EventEmitter {
  public objects: ObjectMap = new ObjectMap()
  public mutator: ObjectMutator = new ObjectMutator(this)
  public eventEmitter: ObjectEventEmitter = new ObjectEventEmitter(this)

  constructor() {
    super()

    this.objects.on(`reference:add`, ({ data: { reference, object } }: { data: { reference: ObjectReference; object: MutableObject } }) => {
      this.eventEmitter.emit({ type: `update:property`, property: new PropertyReference(reference, ANY_PROPERTY) })
    })

    this.objects.on(`reference:removed`, ({ data: { reference, object } }: { data: { reference: ObjectReference; object: MutableObject } }) => {
      this.eventEmitter.emit({ type: `update:property`, property: new PropertyReference(reference, ANY_PROPERTY) })
    })
  }

  public makeObject(id: ObjectID | typeof MUTABLE_OBJECT_RANDOM_ID) {
    const object = new MutableObject(this, id)
    this.objects.add(object, { skipAliases: true, skipReferenceEvents: true })

    return object
  }

  public strictifyReference(reference: ObjectReference): StrictObjectReference {
    if (STRICT_OBJECT_TYPES.includes(reference.type as any)) return reference as StrictObjectReference
    else if (reference.type === `alias`) {
      // TODO: Implement this, probably check gainst ObjectMap to find id
      debugger
    }

    throw new Error(`Unimplemented strictification for reference type "${reference.type}"`)
  }

  /** Verify references for this specific object */
  public verifyReferences(reference: StrictObjectReference) {
    const object = this.objects.getByStrictReference(reference)
    this.objects.update(object)
  }

  /** Cascade changes in an object after it is updated (this is invoked AFTER an update in an object) */
  public cascadeUpdate(reference: ObjectReference, properties: string[]) {
    const objects = this.objects.getByReference(reference)

    const referencedProperties: ObjectPropertyReference[] = []
    for (const object of objects) {
      const aliases = object.getAliases()

      for (const property of properties) {
        // 1. OBJECT ID x PROPERTY
        referencedProperties.push(new PropertyReference(`id`, object.id, property))

        // 2. OBJECT ALIAS x PROPERTY
        for (const alias of aliases) referencedProperties.push(new PropertyReference(`alias`, alias, property))
      }
    }

    // 3. Warn listeners of such changes
    //      A object could be listening for changes in itself (OBJECT LEVEL)
    //      A object A could be listening for changes in object B (MANAGER LEVEL)
    for (const reference of referencedProperties) {
      this.eventEmitter.emit({
        type: `update:property`,
        property: reference,
      })
    }
  }

  /** Applies a Strategy (collection of listeners to compute a object) to a object (by it's reference to MAKE SURE everything is indexed within ObjectMap) */
  public applyStrategy(reference: ObjectReference, strategy: Strategy) {
    const objects = this.objects.getByReference(reference)

    assert(objects.length > 0, `No object found for reference "${reference}"`)
    assert(objects.length === 1, `Multiple objects found for reference "${reference}"`)

    const [object] = objects
    const eventListeners = strategy(object)

    for (const { event, id: name, listener } of eventListeners) {
      const id = `${object.id}:${name}`
      this.eventEmitter.on(event, id, listener)
    }
  }
}
