// import { MutationInstruction } from "./../mutation/instruction"
import { v4 as uuidv4 } from "uuid"
import { EventEmitter } from "@billjs/event-emitter"
import { cloneDeep, get, isEqual, set } from "lodash"

import { Reference } from "@december/utils/access"
import { getDeepProperties, isPrimitive } from "@december/utils/typing"

import churchill, { Block, paint, Paint } from "../logger"

import { Mutation } from "../mutation/mutation"
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

export default class MutableObject<TData extends AnyObject = any> extends EventEmitter {
  public manager: ObjectManager
  public id: ObjectID
  //
  public readonly data: TData = {} as any
  protected setData(data: TData) {
    // @ts-ignore
    this.data = Object.freeze(data)
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
        // check all deep properties inside property
        if (!isPrimitive(mutation.value)) {
          const deepProperties = getDeepProperties(mutation.value as any)
          changedProperties.push(...deepProperties.map(property => `${mutation.property}.${property}`))
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

    // @ts-ignore
    throw new Error(`Method "${mutation.type}" not implemented.`)
  }

  protected SET(mutableData: TData, { type, property, value }: Mutation): MutationInstruction {
    const currentValue = get(mutableData, property)

    if (type !== `OVERRIDE`) assert(currentValue === undefined, `Property "${property}" already exists in data`)
    if (isEqual(currentValue, value)) return { type: `skip` } // property is already set

    set(mutableData, property, value) // mutate mutableData

    return { type: `mutate` }
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
}

export type MutationInstruction = SkipMutationInstruction | MutateMutationInstruction
