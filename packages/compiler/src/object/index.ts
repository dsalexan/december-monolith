// import { MutationInstruction } from "./../mutation/instruction"

import { EventEmitter } from "@billjs/event-emitter"
import { cloneDeep, get, intersection, isArray, isEqual, isObject, isString, last, mergeWith, set, toPath } from "lodash"
import assert from "assert"
import { AnyObject } from "tsdef"

import uuid from "@december/utils/uuid"
import { PropertyReference, Reference, METADATA_PROPERTY } from "@december/utils/access"
import { getDeepProperties, isPrimitive } from "@december/utils/typing"

import churchill, { Block, paint, Paint } from "../logger"

import { DeleteMutation, doesMutationHaveValue, MergeMutation, Mutation, OVERRIDE, OverrideMutation, SET, SetMutation } from "../mutation/mutation"

import type ObjectController from "../controller"
import { IntegrityEntry } from "../controller/integrityRegistry"
import { ObjectPropertyReference } from "./property"
import { EventTrace } from "../controller/eventEmitter/event"
import { Get, Paths } from "type-fest"
import { ToString } from "type-fest/source/internal"
import { StrategyProcessState } from "../controller/strategy/processor"
import { DependencyEntry } from "../controller/dependencyGraph"
import { mergeWithDeep } from "../../../utils/src"

export const logger = churchill.child(`mutableObject`, undefined, { separator: `` })

export const MUTABLE_OBJECT_RANDOM_ID = Symbol.for(`MUTABLE_OBJECT_RANDOM_ID`)

export type ObjectID = string
export type ObjectAlias = string

export type ObjectReference = Reference<`id`, ObjectID> | Reference<`alias`, ObjectAlias> | Reference<`self`, never>
export type UniqueObjectReference = Reference<`id`, ObjectID> | Reference<`id`, never>
export type StrictObjectReference = Reference<`id`, ObjectID>

export const STRICT_OBJECT_TYPES = [`id`] as const
export const UNIQUE_OBJECT_TYPES = [...STRICT_OBJECT_TYPES, `self`] as const

const UNSET_VALUE: unique symbol = Symbol.for(`mutableObject:unset`)

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

export default class MutableObject<TData extends AnyObject = any, TController extends ObjectController = ObjectController> extends EventEmitter {
  public controller: TController
  public id: ObjectID
  //
  public readonly data: TData = {} as any
  protected setData(data: TData) {
    // @ts-ignore
    this.data = Object.freeze(data)
  }

  public metadata: Record<string, any> = {}

  /** Get object's data, but treated for indirect references inside properties */
  public getData(): TData {
    return this._handleValue(this.data, ``) as TData
  }

  /**
   * Treat a whole object for indirect references (metadata properties, processing states and such)
   *
   * @param object Object to be treated
   * @param path Just for backtracking shit in the future i guess, not really revelant now
   */
  public _handleValue(value: any, path: string, deep: boolean = true) {
    // 1. Check if object should be handled differently

    // 1.A. PropertyReference could be found in METADATA (so return whatever is inside metadata)
    if (PropertyReference.isPropertyReference(value)) {
      if (isString(value.property) && value.property.startsWith(`metadata.`)) {
        const valueFromMetadata = get(this, value.property)
        return this._handleValue(valueFromMetadata, path, false)
      }
    }

    // 1.B. Object is a ProcessingState
    if (value instanceof StrategyProcessState) {
      // assert(value.isReady(), `Evaluation is not ready`)
      if (!value.isReady) return undefined

      const runtimeValue = value.evaluation!.runtimeValue

      return runtimeValue
    }

    // 2. Return "regular"

    // 2.A. If should not handle DEEP, just bail
    if (!deep) return value

    // 2.B. Handling primitives
    if (value === undefined || value === null || isPrimitive(value)) return value

    // 2.C Handling arrays
    if (isArray(value)) {
      return [...value].map((item, index) => this._handleValue(item, `${path}.[${index}]`))
    }

    // 2.D. Handling objects
    let other: AnyObject = {}
    for (const [key, local] of Object.entries(value)) {
      other[key] = this._handleValue(local, `${path}.${key}`)
    }

    return other
  }

  public _getDa1ta<TData>(value: any, path: string = ``): TData {
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
    if (isArray(value)) return [...value].map((item, index) => this._getDa1ta(item, `${path}.[${index}]`)) as any

    // OBJECT
    let other: AnyObject = {}
    for (const [key, local] of Object.entries(value)) other[key] = this._getDa1ta(local, `${path}.${key}`)

    return other as any
  }

  public getProperty<TKey extends ToString<Paths<TData>>>(path: TKey): Get<TData, TKey> {
    const value = get(this.data, path)
    return this._handleValue(value, path)
  }

  /** Return mutation instructios to set reference to metadata in specific path */
  public setReferenceToMetadata(path: string, force?: boolean): Mutation[] {
    return [OVERRIDE(path, new PropertyReference(this.reference(), `metadata.${path}`), force)]
  }

  /** Store metadata in object (and also reference in "regular" data) */
  public storeMetadata(value: unknown, targetPath: string, integrityEntries: IntegrityEntry[] = []): Mutation[] {
    assert(integrityEntries.length > 0, `Integrity entries must be provided when storing metadata`)

    // 1. Set in metadata
    set(this.metadata, targetPath, value)

    // 2. Return mutation instructions (since we should still register in "regular" data the reference to metadata)
    return this.setReferenceToMetadata(targetPath)
  }

  constructor(controller: TController, id: ObjectID | typeof MUTABLE_OBJECT_RANDOM_ID = MUTABLE_OBJECT_RANDOM_ID) {
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

  public update(mutations: Mutation[], integrityEntries: IntegrityEntry[], dependencies: DependencyEntry[], trace: EventTrace) {
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

    // 2.A. Register integrity entries
    for (const entry of integrityEntries) this.controller.integrityRegistry.add(entry, trace)

    // 2.B. Register dependency entries
    for (const entry of dependencies) this.controller.dependencyGraph.add(entry)

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
    for (const [i, propertyReference] of referencedProperties.entries()) {
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

  protected SET(mutableData: TData, mutation: SetMutation | OverrideMutation): MutationInstruction {
    const { type, property, value } = mutation

    const currentValue = get(mutableData, property)

    // 1. Check if command should have been a "OVERRIDE" or "MERGE" (latter for objects only)
    if (type !== `OVERRIDE`) {
      // property already exists, check for objects on both sides
      if (currentValue !== undefined) {
        const mergeMutation: MergeMutation = { type: `MERGE`, property, value: value as AnyObject }
        const canMerge = this.canMerge(currentValue, value, mergeMutation, false)
        if (canMerge) return this.MERGE(mutableData, mergeMutation, true)
      }

      assert(currentValue === undefined, `Property "${property}" already exists in data`)
    }

    const shouldForce = type === `OVERRIDE` && (mutation as OverrideMutation).force

    if (isEqual(currentValue, value) && !shouldForce) return { type: `skip` } // property is already set

    set(mutableData, property, value) // mutate mutableData

    return { type: `mutate`, oldValue: currentValue }
  }

  protected DELETE(mutableData: TData, { type, property }: DeleteMutation): MutationInstruction {
    const currentValue = get(mutableData, property)

    delete mutableData[property] // mutate mutableData

    return { type: `mutate`, oldValue: currentValue }
  }

  protected MERGE(mutableData: TData, mutation: MergeMutation, skipCheck: boolean = false): MutationInstruction {
    const { value, property, override } = mutation

    const currentValue = get(mutableData, property)

    // 1. Check if it is eligible for merge
    if (!skipCheck) this.canMerge(currentValue, value, mutation, true)

    // 2. Merge objects
    const newValue = mergeWith({}, currentValue)
    mergeWithDeep(newValue, value)

    // 3. Assign new value at path
    set(mutableData, property, newValue)

    return { type: `mutate`, oldValue: currentValue }
  }

  private canMerge(currentValue: any, value: any, { override }: MergeMutation, throwExceptions = true): boolean {
    const isCurrentlyAObject = isObject(currentValue) && !isArray(currentValue)
    const isValueAObject = isObject(value) && !isArray(value)

    if (throwExceptions) assert(isCurrentlyAObject && isValueAObject, `We can only merge two objects`)
    else if (!(isCurrentlyAObject && isValueAObject)) return false

    if (!override) {
      const currentLeafKeys = getLeafKeys(currentValue)
      const valueLeafKeys = getLeafKeys(value)

      const intersectionKeys = intersection(currentLeafKeys, valueLeafKeys)
      if (throwExceptions) assert(intersectionKeys.length === 0, `Cannot merge objects with shared leaf keys w/o override flag`)
      else if (!(intersectionKeys.length === 0)) return false
    }

    return true
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

function getLeafKeys(object: any, path: string = ``): string[] {
  if (object === undefined || object === null) return [path]
  if (isPrimitive(object)) return [path]

  if (isArray(object)) {
    return object.map((item, index) => getLeafKeys(item, `${path}.[${index}]`)).flat()
  }

  let keys: string[] = []
  for (const [key, value] of Object.entries(object)) {
    keys.push(...getLeafKeys(value, `${path}.${key}`))
  }

  return keys
}
