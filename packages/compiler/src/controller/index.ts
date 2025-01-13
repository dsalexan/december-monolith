import { EventEmitter } from "@billjs/event-emitter"

import ObjectStore from "./store"
import ObjectIntegrityRegistry from "./integrityRegistry"
import ObjectEventEmitter from "./eventEmitter"
import ObjectFrameRegistry, { MutationFrame } from "./frameRegistry"
import ObjectCallQueue from "./callQueue"
import MutableObject, { MUTABLE_OBJECT_RANDOM_ID, ObjectID, StrictObjectReference } from "../object"
import { Generator, Strategy } from "./strategy"
import { getMutationFrameID } from "./frameRegistry/mutationFrame"
import { GenericListener, getListenerID, Listener } from "./eventEmitter/listener"
import ObjectDependencyGraph from "./dependencyGraph"

/**
 * An Object Controller is a centralized manager for all objects.
 * It also centralizes general functions, such as event emitting and object mutation.
 * All objects should be changed through its mechanisms (like queueing), never by hand.
 *
 */

export default class ObjectController extends EventEmitter {
  private managers: {
    store: ObjectStore // handles object storage
    frameRegistry: ObjectFrameRegistry // handles registry of object mutation frames (structure containing subroutine state information) by object (basically a "strategy registry", since strategies mostly centralize mutation functions)
    integrityRegistry: ObjectIntegrityRegistry // handles object pairing (i.e. registry of a tuple (key, value) that is supposed to keep the "integrity" of other shit for the controller)
    //
    eventEmitter: ObjectEventEmitter // handles event emission
    callQueue: ObjectCallQueue // handles queueing of execution contexts
    dependencyGraph: ObjectDependencyGraph
  }
  //
  // eslint-disable-next-line prettier/prettier
  get store() { return this.managers.store }
  // eslint-disable-next-line prettier/prettier
  get frameRegistry() { return this.managers.frameRegistry }
  // eslint-disable-next-line prettier/prettier
  get integrityRegistry() { return this.managers.integrityRegistry }
  //
  // eslint-disable-next-line prettier/prettier
  get eventEmitter() { return this.managers.eventEmitter }
  // eslint-disable-next-line prettier/prettier
  get callQueue() { return this.managers.callQueue }
  // eslint-disable-next-line prettier/prettier
  get dependencyGraph() { return this.managers.dependencyGraph }
  //

  constructor() {
    super()

    this.managers = {
      store: new ObjectStore(this),
      integrityRegistry: new ObjectIntegrityRegistry(this),
      frameRegistry: new ObjectFrameRegistry(this),
      //
      eventEmitter: new ObjectEventEmitter(this),
      callQueue: new ObjectCallQueue(this),
      dependencyGraph: new ObjectDependencyGraph(this),
    }

    this.listen()
  }

  listen() {
    for (const [name, manager] of Object.entries(this.managers)) manager.listen()
  }

  /** Create and store new object for controller */
  public makeObject(id: ObjectID | typeof MUTABLE_OBJECT_RANDOM_ID) {
    const object = new MutableObject(this, id)
    this.store.add(object, { skipAliases: true, skipReferenceEvents: true })

    return object
  }

  /** Applies a Strategy (collection of listeners to compute a object) to a object (by it's reference to MAKE SURE everything is indexed within ObjectMap) */
  public applyStrategy(object: MutableObject, strategy: Strategy) {
    // 1. Frame and register mutation functions
    let index = 0
    for (const genericFrame of strategy.frameRegistry.values()) {
      const frame: MutationFrame = {
        ...genericFrame,
        id: getMutationFrameID(object.id, genericFrame),
        index,
      }

      object.controller.frameRegistry.register(object.id, frame)
    }

    // 2. Add listeners to event emitter
    const listeners = strategy.listenerGenerators.map(generator => {
      const genericListener = generator(object)
      return { ...genericListener, id: getListenerID(object.id, genericListener) }
    })
    for (const listener of listeners) {
      object.controller.eventEmitter.addListener(listener)
    }
  }
}
