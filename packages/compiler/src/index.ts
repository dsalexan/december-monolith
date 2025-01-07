import { isString, set } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "./logger"

// export { default as ObjectManager } from "./manager"
export { default as ObjectController } from "./controller"
export { default as ObjectStore } from "./controller/store"
export { default as ObjectIntegrityRegistry } from "./controller/integrityRegistry"
export type { IntegrityEntry } from "./controller/integrityRegistry"
export { default as ObjectEventEmitter, makeArtificialEventTrace } from "./controller/eventEmitter"
export { default as ObjectFrameRegistry } from "./controller/frameRegistry"
export { default as ObjectCallQueue } from "./controller/callQueue"
export { Strategy, mergeMutationInput } from "./controller/strategy"
export type { MutationInput } from "./controller/strategy"

export { default as MutableObject } from "./object"

export { SET, OVERRIDE } from "./mutation"
export type { Mutation } from "./mutation/mutation"
// export { DYNAMIC_MUTATION_HASH } from "./manager/mutator"

// export { Signature } from "./manager/events/signature"

// export type { ListenerFunctionContext } from "./manager/events/emitter"
// export type { ReferenceIndexedEvent_Handle } from "./manager/events/events"

import MutableObject from "./object"
import { Mutation, SET } from "./mutation/mutation"
// import { Signature } from "./manager/events/signature"
