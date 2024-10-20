import assert from "assert"
import { ExecutionContext } from "./executionContext"
import { isString } from "lodash"
import { Nullable } from "tsdef"

export type CallQueueTag = string

export class CallQueue {
  index: number
  tags: CallQueueTag[]
  queue: Map<ExecutionContext[`id`], ExecutionContext>

  constructor(index: number, ...tags: string[]) {
    this.index = index
    this.tags = tags
    this.queue = new Map()
  }

  toString() {
    let _tags: string = ``
    if (this.tags.length > 0) _tags = ` (${this.tags.join(`, `)})`

    return `#${this.index}${_tags}`
  }

  /** Checks if an Execution Context is already enqueued */
  has(executionContextID: ExecutionContext[`id`]): boolean
  has(executionContext: ExecutionContext): boolean
  has(executionContextOrID: ExecutionContext | ExecutionContext[`id`]): boolean {
    const id = isString(executionContextOrID) ? executionContextOrID : executionContextOrID.id

    return this.queue.has(id)
  }

  /** Get Execution Context from queue */
  get(executionContextID: ExecutionContext[`id`]): Nullable<ExecutionContext> {
    return this.queue.get(executionContextID) ?? null
  }

  /** Enqueues an Execution Context */
  enqueue(executionContext: ExecutionContext) {
    assert(!this.has(executionContext), `Execution Context with ID "${executionContext.id}" already exists in Queue ${this.toString()}`)

    this.queue.set(executionContext.id, executionContext)
  }

  /** Dequeues an Execution Context */
  dequeue(executionContextID: ExecutionContext[`id`]): ExecutionContext {
    const executionContext = this.get(executionContextID)
    assert(executionContext, `Execution Context with ID "${executionContextID}" does not exist in Queue ${this.toString()}`)

    this.queue.delete(executionContextID)

    return executionContext
  }
}
