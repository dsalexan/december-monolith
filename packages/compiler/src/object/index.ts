// import { MutationInstruction } from "./../mutation/instruction"
import { v4 as uuidv4 } from "uuid"
import { EventEmitter } from "@billjs/event-emitter"
import { cloneDeep, get, isArray, isEqual, set } from "lodash"

import { Reference } from "@december/utils/access"
import { getDeepProperties, isPrimitive } from "@december/utils/typing"

import churchill, { Block, paint, Paint } from "../logger"

import { DeleteMutation, doesMutationHaveValue, Mutation, OverrideMutation, SetMutation } from "../mutation/mutation"
import type ObjectManager from "../manager"
import assert from "assert"
import { AnyObject } from "tsdef"

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
  public manager: ObjectManager
  public id: ObjectID
  //
  public readonly data: TData = {} as any
  protected setData(data: TData) {
    // @ts-ignore
    this.data = Object.freeze(data)
  }

  public metadata: Record<string, any> = {}

  public getData(): TData {
    return this._getData(this.data, ``) as TData
  }

  protected _getData(value: any, path: string = ``) {
    // REFERENCE
    if (value instanceof Reference) {
      const reference = value as Reference
      if (reference.type === `metadata`) return this.metadata[reference.value]

      throw new Error(`Reference "${reference.type}" not implemented`)
    }

    // PRIMITIVES
    if (value === undefined) return undefined
    if (value === null) return null
    if (isPrimitive(value)) return value

    // ARRAY
    if (isArray(value)) return [...value].map((item, index) => this._getData(item, `${path}.[${index}]`))

    // OBJECT
    let other: AnyObject = {}
    for (const [key, local] of Object.entries(value)) other[key] = this._getData(local, `${path}.${key}`)

    return other
  }

  constructor(manager: ObjectManager, id: ObjectID | typeof MUTABLE_OBJECT_RANDOM_ID = MUTABLE_OBJECT_RANDOM_ID) {
    super()

    this.manager = manager
    this.id = id === MUTABLE_OBJECT_RANDOM_ID ? uuidv4() : id
  }

  public getAliases(): ObjectAlias[] {
    const aliases = get(this.data, `__.aliases`, [])

    assert(Array.isArray(aliases), `Aliases not evaluated in object "${this.id}"`)

    return aliases
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

  public update(mutations: Mutation[]) {
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
          const deepProperties = getDeepProperties(instruction.oldValue as AnyObject)
          for (const property of deepProperties) {
            const fullProperty = `${mutation.property}.${property}`
            if (!changedProperties.includes(fullProperty)) changedProperties.push(fullProperty)
          }
        }

        // get deep properties of new value
        if (doesMutationHaveValue(mutation) && !isPrimitive(mutation.value)) {
          const deepProperties = getDeepProperties(mutation.value as AnyObject)
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

    // if nothing was changed, bail out
    if (changedProperties.length === 0) return false

    // 2. Save new data
    this.setData(newData)

    const reference = this.reference(`id`) as StrictObjectReference

    // 3. Warn manager to re-check references (mostly aliases for now)
    this.manager.verifyReferences(reference)

    // 4. Cascade update to manager
    this.manager.cascadeUpdate(reference, changedProperties)

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
