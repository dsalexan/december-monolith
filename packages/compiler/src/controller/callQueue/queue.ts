import assert from "assert"
import { ExecutionContext } from "./executionContext"
import { isString, orderBy } from "lodash"
import { MaybeUndefined, Nullable } from "tsdef"
import { ObjectID } from "../../object"

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

  /** Order execution contexts by priority (lower priority is "better") */
  orderByPriority(priorityByObjectID: MaybeUndefined<Record<ObjectID, number>>): ExecutionContext[] {
    if (priorityByObjectID === undefined) return [...this.queue.values()]

    let executionContexts: ExecutionContext[] = []

    // 1. Fix priorities
    for (const executionContext of this.queue.values()) {
      const priority = priorityByObjectID[executionContext.object.value] ?? Infinity

      executionContext.priority = priority
      executionContexts.push(executionContext)
    }

    // 2. Order by priority AND index
    executionContexts = orderBy(executionContexts, [`priority`, `index`], [`asc`, `asc`])

    return executionContexts
  }
}
