import assert from "assert"
import { identity } from "lodash"
import { AnyObject } from "tsdef"

import { arrayJoin } from "@december/utils"
import { isPrimitive } from "@december/utils/typing"

import { Block, paint } from "../../logger"

import type { Event, EventDispatcher } from "../eventEmitter/event"
import { GenericMutationFrame } from "../frameRegistry"
import { ObjectReference, StrictObjectReference } from "../../object"
import { CallQueue } from "./queue"

export interface BareExecutionContext<TEvent extends Event = Event> {
  name: GenericMutationFrame[`name`] // name of the mutation function to run
  arguments?: AnyObject
  eventDispatcher: EventDispatcher<TEvent>
}

export interface ExecutionContext<TEvent extends Event = Event> extends BareExecutionContext<TEvent> {
  id: string
  index: number
  //
  object: StrictObjectReference
  //
  listenerID: string
}

export interface ExplainExecutionContextOptions {
  object: ObjectReference
  queue: CallQueue
}

/** Convert all arguments in an execution context to a hash */
export function hashExecutionContextArguments(bareExecutionContext: BareExecutionContext): string[] {
  const _arguments: string[] = []
  for (const [key, value] of Object.entries(bareExecutionContext.arguments ?? {})) {
    assert(isPrimitive(value), `Implement hashing for this`)

    _arguments.push(`${key}:${String(value)}`)
  }

  return _arguments
}

/** Get unique execution context ID */
export function getExecutionContextID(strictObject: StrictObjectReference, bareExecutionContext: BareExecutionContext): ExecutionContext[`id`] {
  const _arguments = hashExecutionContextArguments(bareExecutionContext).join(`,`)

  return `${strictObject.toString()}::${bareExecutionContext.name}${_arguments === `` ? `` : `:${_arguments}`}`
}

export function explainExecutionContext(executionContext: ExecutionContext, { object, queue }: Partial<ExplainExecutionContextOptions> = {}): Block[] {
  const blocks: Block[] = []

  // 1. Push basics
  blocks.push(
    //
    paint.white.bold((object ?? executionContext.object).toString()),
    paint.identity(` `),
    paint.white(executionContext.name),
    paint.identity(` `),
  )

  // 2. Unshift queue stuff
  if (queue) blocks.unshift(...paint.grey(queue.toString(), `, `, paint.white(executionContext.index), `/${queue.queue.size}`, ` `))

  // 3. Push arguments
  const _arguments: Block[] = []
  for (const [key, value] of Object.entries(executionContext.arguments ?? {})) {
    _arguments.push(
      //
      paint.bold(key),
      paint.dim.grey(`:`),
      paint.identity(value.toString()) as any,
    )
  }

  if (_arguments.length > 0) {
    blocks.push(paint.dim.grey(`{`))
    blocks.push(...arrayJoin(_arguments, paint.dim.grey(`, `)))
    blocks.push(paint.dim.grey(`}`))
  }

  return blocks
}
