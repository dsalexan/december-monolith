import assert from "assert"
import { AnyObject, MaybeUndefined, Nullable } from "tsdef"
import { EventEmitter } from "@billjs/event-emitter"
import { identity, isArray, isEqual, last, sortBy, uniq } from "lodash"

import { Reference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../../logger"

import MutableObject, { ObjectAlias, ObjectID, ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../../object"

import type ObjectController from ".."
import { ObjectManager } from "../manager"

import { IntegrityEntry } from "../integrityRegistry"
import { CallQueue, CallQueueTag } from "./queue"
import { BareExecutionContext, ExecutionContext, explainExecutionContext, getExecutionContextID } from "./executionContext"
import { Mutation } from "../../mutation/mutation"
import { MutationFunctionMetadata } from "../frameRegistry/mutationFrame"

export type { ExecutionContext, BareExecutionContext } from "./executionContext"

export const logger = churchill.child(`compiler`, undefined, { separator: `` })

/**
 * An Object Call Queue is responsible for queueing the mutation functions (usually invoked by an event triggered)
 */

export default class ObjectCallQueue extends ObjectManager {
  protected _queues: {
    byIndex: CallQueue[]
    byTag: Map<CallQueueTag, CallQueue[`index`][]>
  }
  //
  public current: Nullable<{
    queue: number
    executionContext: number
  }>

  constructor(controller: ObjectController) {
    super(controller)

    this.reset()
  }

  get numberOfQueues() {
    return this._queues.byIndex.length
  }

  /** Reset Call Queues  */
  public reset() {
    this._queues = {
      byIndex: [],
      byTag: new Map(),
    }

    this.current = null
  }

  /** Make (and index) new queue */
  public makeQueue(tag: string) {
    const index = this._queues.byIndex.length
    const queue = new CallQueue(index, tag)

    this.indexQueue(queue)

    return queue
  }

  /** Index queue */
  public indexQueue(queue: CallQueue) {
    // 1. INDEX -> QUEUE
    assert(!this._queues.byIndex[queue.index], `Queue with index "${queue.index}" already exists`)
    this._queues.byIndex[queue.index] = queue

    // 2. TAG -> QUEUE
    for (const tag of queue.tags) {
      const indexes = this._queues.byTag.get(tag) ?? []
      this._queues.byTag.set(tag, sortBy([...indexes, queue.index]))
    }
  }

  /** Get queue by tag */
  public getQueue(tag: string): Nullable<CallQueue> {
    const _queues = this._queues.byTag.get(tag) ?? []
    const queues = _queues.map(index => this._queues.byIndex[index])

    assert(queues.length > 1, `Too many queues for tag "${tag}"`)

    return queues[0] ?? null
  }

  /** Get next suitable queue for enqueueing */
  public getNextQueue(tag?: string): CallQueue {
    let queue: Nullable<CallQueue> = null

    // 1. Get last queue in list
    if (this.numberOfQueues > 0) queue = last(this._queues.byIndex)!

    // 2. If queue is already running OR ran already, ignore
    if (queue && this.current && queue.index <= this.current.queue) queue = null

    // 3. If no suitable queue was found, make new one
    if (queue === null) queue = this.makeQueue(tag ?? `default`)

    assert(queue, `Queue not found`)

    return queue
  }

  /** Check if execution context should be skiped in enqueueing */
  public shouldSkip(executionContext: ExecutionContext): boolean {
    for (const queue of this._queues.byIndex) {
      // 1. If queue already ran, ignore it here
      if (this.current && queue.index < this.current.queue) continue

      if (queue.has(executionContext)) {
        if (this.current && this.current.queue === queue.index) {
          // 2. If execution context already ran, then it should be disregarded for skipping purposes
          if (executionContext.index < this.current.executionContext) continue
        }

        // 3. There is a future executionContext still to run, so dont enqueue new one
        return true
      }
    }

    return false
  }

  /** Dequeue a call to mutate an object */
  public dequeue(object: ObjectReference, bareExecutionContext: BareExecutionContext): boolean
  public dequeue(_object: ObjectReference, bareExecutionContext: BareExecutionContext): boolean {
    // 1. If there is no queue, do nothing
    if (this.numberOfQueues === 0) return false

    const object: StrictObjectReference = this.controller.store.strictifyReference(_object)
    const executionContextID: ExecutionContext[`id`] = getExecutionContextID(object, bareExecutionContext)

    for (const queue of this._queues.byIndex) {
      // 2. If queue already ran, ignore it here
      if (this.current && queue.index < this.current.queue) continue

      const executionContext = queue.get(executionContextID)

      // 3. Check if there are any execution contexts in this queue
      if (!executionContext) continue

      // 4. Check if execution context already ran
      if (this.current && executionContext.index < this.current.executionContext) {
        if (this.__DEBUG) {
          logger.add(...paint.grey(`[`, paint.red.dim(`dequeue/`), paint.red.dim.bold(`skip`), `]`)).add(` `)
          logger.add(...explainExecutionContext(executionContext, { queue }))
          logger.add(paint.italic.grey(` (context was already executed)`))
          logger.info()
        }

        continue
      }

      // 5. Dequeue execution context
      if (this.__DEBUG) {
        logger.add(...paint.grey(`[`, paint.yellow.dim(`dequeue`), `]`)).add(` `)
        logger.add(...paint.grey(queue.toString(), paint.white(executionContext.index), `/${queue.queue.size}`)).add(` `)
        logger.add(...explainExecutionContext(executionContext))
        logger.info()
      }

      queue.dequeue(executionContextID)
    }

    return true
  }

  /** Enqueue a call to mutate an object */
  public enqueue(object: ObjectReference, bareExecutionContext: BareExecutionContext): boolean
  public enqueue(_object: ObjectReference, bareExecutionContext: BareExecutionContext): boolean {
    const queue = this.getNextQueue()
    const object: StrictObjectReference = this.controller.store.strictifyReference(_object)

    // 1. Build full Execution Context
    const executionContext: ExecutionContext = {
      ...bareExecutionContext,
      id: getExecutionContextID(object, bareExecutionContext),
      index: queue.queue.size,
      //
      object,
      //
      listenerID: `listenerID` as any,
    }

    // 2. Check if execution context was already enqueued in some future queue to SKIP IT
    // if (executionContext.id === `id:12899::compute:mode`) debugger
    const doSkip = this.shouldSkip(executionContext)
    if (doSkip) {
      if (this.__DEBUG) {
        logger.add(...paint.grey(`[`, paint.red.dim(`enqueue/`), paint.red.dim.bold(`skip`), `]`)).add(` `)
        logger.add(...explainExecutionContext(executionContext, { object: _object, queue }))
        logger.info()
      }

      return false
    }

    // 3. Enqueue execution context
    if (this.__DEBUG) {
      logger.add(...paint.grey(`[`, paint.yellow.dim(`enqueue`), `]`)).add(` `)
      logger.add(...explainExecutionContext(executionContext, { object: _object, queue }))
      logger.info()
    }

    queue.enqueue(executionContext)

    return true
  }

  /** Run all queues */
  public execute() {
    if (this.__DEBUG) logger.add(paint.grey(`[run] ${this.numberOfQueues} queues`)).info()

    for (const queue of this._queues.byIndex) {
      // 1. Update current cursors
      this.current = { queue: queue.index, executionContext: -1 }

      // 2. Run all execution contexts in queue
      for (const executionContext of queue.queue.values()) {
        this.current.executionContext = executionContext.index

        if (this.__DEBUG) {
          logger.add(...paint.grey(`[`, paint.magenta.dim(`execute`), `]`)).add(` `)
          logger.add(...explainExecutionContext(executionContext, { queue }))
          logger.info()
        }

        this.executeContext(executionContext)
      }
    }
  }

  /** Execute specific context */
  protected executeContext(executionContext: ExecutionContext): boolean {
    // 1. Get stuff from storage and registries
    const object = this.controller.store.getByReference(executionContext.object, true)!
    const mutationFrame = this.controller.frameRegistry.get(object.id, executionContext.name)

    assert(mutationFrame, `Mutation frame of function  "${executionContext.name}" not found for object "${object.id}"`)

    // 2. Execute frame
    const metadata: MutationFunctionMetadata = {
      arguments: executionContext.arguments ?? {},
      executionContext,
      //
      callQueue: this,
      frameRegistry: this.controller.frameRegistry,
    }

    const mutationFrameReturn = mutationFrame.fn(object, metadata)

    // 3. Parse return
    let mutations: Mutation[] = []
    let integrityEntries: IntegrityEntry[] = []

    if (isArray(mutationFrameReturn)) mutations = mutationFrameReturn
    else if (`mutations` in mutationFrameReturn) {
      mutations = isArray(mutationFrameReturn.mutations) ? mutationFrameReturn.mutations : [mutationFrameReturn.mutations]
      integrityEntries = mutationFrameReturn.integrityEntries
    } else mutations = [mutationFrameReturn]

    // 4. Update stuff
    return object.update(mutations, integrityEntries, {
      previousEvent: executionContext.eventDispatcher,
    })
  }
}
