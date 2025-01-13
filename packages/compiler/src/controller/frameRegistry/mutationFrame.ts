import { AnyObject, MaybeArray } from "tsdef"

import { Event } from "../eventEmitter/event"
import { Mutation } from "../../mutation/mutation"
import MutableObject, { ObjectID } from "../../object"
import ObjectCallQueue, { ExecutionContext } from "../callQueue"

import ObjectFrameRegistry from "."
import { IntegrityEntry } from "../integrityRegistry"
import { DependencyEntry } from "../dependencyGraph"

export interface MutationFunctionMetadata<TEvent extends Event = Event> {
  arguments: AnyObject // all arguments in context for easier access inside function declaration
  executionContext: ExecutionContext<TEvent>
  callQueue: ObjectCallQueue
  frameRegistry: ObjectFrameRegistry
}

export type MutationFunctionOutput = { mutations: Mutation[]; integrityEntries: IntegrityEntry[]; dependencies: DependencyEntry[] }
export type MutationFunctionReturn = MaybeArray<Mutation> | { mutations: MaybeArray<Mutation>; integrityEntries: IntegrityEntry[]; dependencies: DependencyEntry[] } | MutationFunctionOutput
export type MutationFunction = (object: MutableObject, metadata: MutationFunctionMetadata) => MutationFunctionReturn

export interface GenericMutationFrame {
  name: string
  fn: MutationFunction
}

export interface MutationFrame extends GenericMutationFrame {
  id: string // composition of objectID, function name and (probably in the future) arguments
  index: number
}

export function getMutationFrameID(objectID: ObjectID, frame: GenericMutationFrame): MutationFrame[`id`] {
  return `${objectID}::${frame.name}`
}
