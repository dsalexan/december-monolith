import { v4 as uuidv4 } from "uuid"
import { isString, set } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "./logger"

export { default as ObjectManager } from "./manager"
export { default as MutableObject } from "./object"
export { Strategy } from "./strategy"

export { SET, OVERRIDE } from "./mutation"
export type { Mutation } from "./mutation/mutation"
export { DYNAMIC_MUTATION_HASH } from "./manager/mutator"

export { Signature } from "./manager/events/signature"

export type { ListenerFunctionContext } from "./manager/events/emitter"
export type { ReferenceIndexedEvent_Handle } from "./manager/events/events"

import MutableObject from "./object"
import { Mutation, SET } from "./mutation/mutation"
import { Signature } from "./manager/events/signature"

export function setupMetadata(object: MutableObject, pathOrSignature: string | Signature, value: unknown, hash?: string): Mutation[] {
  const instructions: Mutation[] = []
  let path: string, signature: Signature

  // 1. Parse arguments
  if (isString(pathOrSignature)) {
    path = pathOrSignature
    signature = new Signature(object.id, path, hash ?? uuidv4())
  } else {
    path = pathOrSignature.path
    signature = hash !== undefined ? new Signature(object.id, path, hash) : pathOrSignature
  }

  // 2. Push signature instruction
  instructions.push(signature.instruction())

  // 3. Set metadata
  set(object.metadata, path, value)
  instructions.push(SET(path, new Reference(`metadata`, path)))

  return instructions
}
