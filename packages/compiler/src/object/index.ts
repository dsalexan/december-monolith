// import { MutationInstruction } from "./../mutation/instruction"

import { EventEmitter } from "@billjs/event-emitter"
import { cloneDeep, get, isArray, isEqual, isString, last, set, toPath } from "lodash"
import assert from "assert"
import { AnyObject } from "tsdef"

import uuid from "@december/utils/uuid"
import { PropertyReference, Reference, METADATA_PROPERTY } from "@december/utils/access"
import { getDeepProperties, isPrimitive } from "@december/utils/typing"

import churchill, { Block, paint, Paint } from "../logger"

import { DeleteMutation, doesMutationHaveValue, Mutation, OverrideMutation, SET, SetMutation } from "../mutation/mutation"

import type ObjectController from "../controller"
import { IntegrityEntry } from "../controller/integrityRegistry"
import { ObjectPropertyReference } from "./property"
import { EventTrace } from "../controller/eventEmitter/event"

export const MUTABLE_OBJECT_RANDOM_ID = Symbol.for(`MUTABLE_OBJECT_RANDOM_ID`)

export type ObjectID = string
export type ObjectAlias = string

export type ObjectReference = Reference<`id`, ObjectID> | Reference<`alias`, ObjectAlias> | Reference<`self`, never>
export type UniqueObjectReference = Reference<`id`, ObjectID> | Reference<`id`, never>
export type StrictObjectReference = Reference<`id`, ObjectID>

export const STRICT_OBJECT_TYPES = [`id`] as const
export const UNIQUE_OBJECT_TYPES = [...STRICT_OBJECT_TYPES, `self`] as const

export interface ObjectUpdateEventData {
  object: ObjectID
  properties: string[]
  mutations: Mutation[]
}

function getData(value: any, path: string = ``) {
  if (value instanceof Reference) {
    debugger
  }

  if (value === undefined) return undefined
  if (value === null) return null
  if (isPrimitive(value)) return value

  if (isArray(value)) return [...value].map((item, index) => getData(item, `${path}.[${index}]`))

  let other: AnyObject = {}
  for (const [key, local] of Object.entries(value)) other[key] = getData(local, `${path}.${key}`)

  return other
}

export default class MutableObject<TData extends AnyObject = any> extends EventEmitter {
  public controller: ObjectController
  public id: ObjectID
  //
  public readonly data: TData = {} as any
  protected setData(data: TData) {
    // @ts-ignore
    this.data = Object.freeze(data)
  }

  public metadata: Record<string, any> = {}

  public getData(path: string = ``): TData {
    return this._getData(this.data, path) as TData
  }

  public _getData<TData>(value: any, path: string = ``): TData {
    // if (path === `modes.[0].form`) debugger

    // REFERENCE
    if (Reference.isReference(value)) return value as any
    if (PropertyReference.isPropertyReference(value)) {
      if (isString(value.property) && value.property.startsWith(`metadata.`)) return get(this, value.property)
      else return value as any
    }

    // PRIMITIVES
    if (value === undefined) return undefined as any
    if (value === null) return null as any
    if (isPrimitive(value)) return value as any

    // ARRAY
    if (isArray(value)) return [...value].map((item, index) => this._getData(item, `${path}.[${index}]`)) as any

    // OBJECT
    let other: AnyObject = {}
    for (const [key, local] of Object.entries(value)) other[key] = this._getData(local, `${path}.${key}`)

    return other as any
  }

  public getProperty<TKey extends keyof TData>(path: TKey): TData[TKey] {
    const _path = toPath(path)
    return this._getData(get(this.data, path), last(_path)!)
  }

  /** Store metadata in object (and also reference in "regular" data) */
  public storeMetadata(value: unknown, targetPath: string, integrityEntries: IntegrityEntry[] = []): Mutation[] {
    assert(integrityEntries.length > 0, `Integrity entries must be provided when storing metadata`)

    // 1. Set in metadata
    set(this.metadata, targetPath, value)

    // 2. Return mutation instructions (since we should still register in "regular" data the reference to metadata)
    return [SET(targetPath, new PropertyReference(this.reference(), `metadata.${targetPath}`))]
  }

  constructor(controller: ObjectController, id: ObjectID | typeof MUTABLE_OBJECT_RANDOM_ID = MUTABLE_OBJECT_RANDOM_ID) {
    super()

    this.controller = controller
    this.id = id === MUTABLE_OBJECT_RANDOM_ID ? uuid() : id
  }

  public makeIntegrityEntry(key: string, value: string): IntegrityEntry {
    return { key: `${this.id}::${key}`, value }
  }

  public getAliases(): ObjectAlias[] {
    const aliases = get(this.data, `__.aliases`, [])

    assert(Array.isArray(aliases), `Aliases not evaluated in object "${this.id}"`)

    return aliases
  }

  public toString(): string {
    const [alias] = this.getAliases()

    if (!alias) return this.id
    else return `${alias} <id:${this.id}>`
  }

  public reference(type: `id` | `alias` = `id`): ObjectReference {
    if (type === `id`) return new Reference(`id`, this.id)
    else if (type === `alias`) {
      const aliases = this.getAliases()

      assert(aliases.length > 0, `Object "${this.id}" has no aliases`)

      return new Reference(`alias`, aliases[0])
    }

    throw new Error(`Invalid reference type "${type}"`)
  }

  public update(mutations: Mutation[], integrityEntries: IntegrityEntry[], trace: EventTrace) {
    const changedProperties: string[] = []

    // 1. Mutate object as per instruction
    let newData = cloneDeep(this.data)
    for (const mutation of mutations) {
      const instruction = this.mutate(newData, mutation)

      if (instruction.type === `skip`) continue
      else if (instruction.type === `mutate`) {
        changedProperties.push(mutation.property) // root property was changed

        // get deep properties of old value
        if (!isPrimitive(instruction.oldValue)) {
          // EXCEPTION: ignore deep properties for METADATA REFERENCE
          const deepProperties = getDeepProperties(instruction.oldValue as AnyObject, ``, (path, value) => isMetadataReference(value))
          for (const property of deepProperties) {
            const fullProperty = `${mutation.property}.${property}`
            if (!changedProperties.includes(fullProperty)) changedProperties.push(fullProperty)
          }
        }

        // get deep properties of new value
        if (doesMutationHaveValue(mutation) && !isPrimitive(mutation.value)) {
          // EXCEPTION: ignore deep properties for METADATA REFERENCE
          const deepProperties = getDeepProperties(mutation.value as AnyObject, ``, (path, value) => isMetadataReference(value))
          for (const property of deepProperties) {
            const fullProperty = `${mutation.property}.${property}`
            if (!changedProperties.includes(fullProperty)) changedProperties.push(fullProperty)
          }
        }
      }
      //
      // @ts-ignore
      else throw new Error(`Invalid mutation instruction type "${instruction.type}"`)
    }

    // 2. Register integrity entries
    for (const entry of integrityEntries) this.controller.integrityRegistry.add(entry, trace)

    // if nothing was changed, bail out
    if (changedProperties.length === 0) return false

    // 3. Save new data
    this.setData(newData)

    // 4. Warn manager to re-check references (mostly aliases for now)
    this.controller.store.update(this)

    // 5. Cascade update to controller
    const aliases = this.getAliases()

    // 5.A. Build a list of referenced properties with all aliases
    const referencedProperties: ObjectPropertyReference[] = []
    for (const property of changedProperties) {
      // OBJECT ID x PROPERTY
      referencedProperties.push(new PropertyReference(`id`, this.id, property))

      // OBJECT ALIAS x PROPERTY
      for (const alias of aliases) referencedProperties.push(new PropertyReference(`alias`, alias, property))
    }

    // 5.B. Emit this shitton of events
    //      A object could be listening for changes in itself (OBJECT LEVEL)
    //      A object A could be listening for changes in object B (CONTROLLER LEVEL)
    for (const propertyReference of referencedProperties) {
      this.controller.eventEmitter.emit({
        type: `property:updated`,
        property: propertyReference,
        trace,
      })
    }

    return true
  }

  protected mutate(mutableData: TData, mutation: Mutation): MutationInstruction {
    if (mutation.type === `SET` || mutation.type === `OVERRIDE`) return this.SET(mutableData, mutation)
    else if (mutation.type === `DELETE`) return this.DELETE(mutableData, mutation)

    // @ts-ignore
    throw new Error(`Method "${mutation.type}" not implemented.`)
  }

  protected SET(mutableData: TData, { type, property, value }: SetMutation | OverrideMutation): MutationInstruction {
    const currentValue = get(mutableData, property)

    if (type !== `OVERRIDE`) assert(currentValue === undefined, `Property "${property}" already exists in data`)
    if (isEqual(currentValue, value)) return { type: `skip` } // property is already set

    set(mutableData, property, value) // mutate mutableData

    return { type: `mutate`, oldValue: currentValue }
  }

  protected DELETE(mutableData: TData, { type, property }: DeleteMutation): MutationInstruction {
    const currentValue = get(mutableData, property)

    delete mutableData[property] // mutate mutableData

    return { type: `mutate`, oldValue: currentValue }
  }
}

export interface BaseMutationInstruction {
  type: string
}

export interface SkipMutationInstruction extends BaseMutationInstruction {
  type: `skip`
}

export interface MutateMutationInstruction extends BaseMutationInstruction {
  type: `mutate`
  oldValue: unknown
}

export type MutationInstruction = SkipMutationInstruction | MutateMutationInstruction

function isMetadataReference(value: unknown): value is PropertyReference {
  if (!PropertyReference.isPropertyReference(value)) return false
  if (isString(value.property)) return value.property.startsWith(`metadata.`)

  debugger
  return false
}
