import assert from "assert"
import { AnyObject, MaybeUndefined, Nullable } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"
import { identity, isEqual, sortBy, uniq } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../../logger"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"

import type ObjectController from ".."
import { ObjectManager } from "../manager"
import { Mutation } from "../../mutation/mutation"

export const logger = churchill.child(`compiler`, undefined, { separator: `` })

export type { MutationFrame, GenericMutationFrame } from "./mutationFrame"
import { MutationFrame, GenericMutationFrame } from "./mutationFrame"

/**
 * An Object Frame Registry is responsible for storing mutation frames for the objects
 *    A Mutation Frame holds all information about suboutine/function stat
 */

export default class ObjectFrameRegistry extends ObjectManager {
  protected _registry: {
    byObjectID: Record<ObjectID, Map<MutationFrame[`name`], MutationFrame>>
  } = {
    byObjectID: {},
  }

  constructor(controller: ObjectController) {
    super(controller)
  }

  has(objectID: ObjectID, mutationFunction: GenericMutationFrame): boolean
  has(objectID: ObjectID, mutationFunctionName: GenericMutationFrame[`name`]): boolean
  has(objectID: ObjectID, mutationFunctionOrName: GenericMutationFrame[`name`] | GenericMutationFrame): boolean {
    const name = typeof mutationFunctionOrName === `string` ? mutationFunctionOrName : mutationFunctionOrName.name

    return this._registry.byObjectID[objectID]?.has(name) ?? false
  }

  get(objectID: ObjectID, name: GenericMutationFrame[`name`]): Nullable<MutationFrame> {
    return this._registry.byObjectID[objectID]?.get(name) ?? null
  }

  /** Register a new mutation frame */
  public register(objectID: ObjectID, mutationFunction: GenericMutationFrame): MutationFrame
  public register(objectID: ObjectID, name: GenericMutationFrame[`name`], fn: GenericMutationFrame[`fn`]): MutationFrame
  public register(objectID: ObjectID, mutationFunctionOrName: GenericMutationFrame[`name`] | GenericMutationFrame, fn?: GenericMutationFrame[`fn`]): MutationFrame {
    const genericMutationFrame: GenericMutationFrame = {
      name: typeof mutationFunctionOrName === `string` ? mutationFunctionOrName : mutationFunctionOrName.name,
      fn: typeof mutationFunctionOrName === `string` ? fn! : mutationFunctionOrName.fn,
    }

    assert(!this.has(objectID, genericMutationFrame.name), `Mutation function "${genericMutationFrame.name}" already exists for object "${objectID}"`)

    this._registry.byObjectID[objectID] ??= new Map()

    const mutationFunction: MutationFrame = {
      ...genericMutationFrame,
      id: `${objectID}::${genericMutationFrame.name}`,
      index: this._registry.byObjectID[objectID].size,
    }

    this._registry.byObjectID[objectID].set(mutationFunction.name, mutationFunction)

    return mutationFunction
  }
}
