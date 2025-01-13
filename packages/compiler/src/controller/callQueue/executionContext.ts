import assert from "assert"
import { cloneDeep, has, identity, isNil, omit, get } from "lodash"
import { AnyObject, MaybeArray } from "tsdef"

import { arrayJoin } from "@december/utils"
import { PatternMatchInfo } from "@december/utils/match"
import { RegexPatternMatchInfo } from "@december/utils/match/element"
import { PropertyReferencePatternMatchInfo } from "@december/utils/access/match"
import { isPrimitive } from "@december/utils/typing"
import { Reference, PropertyReference } from "@december/utils/access"

import { Block, paint } from "../../logger"

import type { Event, EventDispatcher } from "../eventEmitter/event"
import { GenericMutationFrame } from "../frameRegistry"
import { ObjectReference, StrictObjectReference } from "../../object"
import { CallQueue } from "./queue"
import type ObjectController from ".."

export type ArgumentProvider = (bareExecutionContext: BareExecutionContext) => AnyObject

export interface BareExecutionContext<TEvent extends Event = Event> {
  name: GenericMutationFrame[`name`] // name of the mutation function to run
  // arguments?: AnyObject
  hashableArguments?: AnyObject
  otherArguments?: AnyObject
  eventDispatcher: EventDispatcher<TEvent>
  argumentProvider?: MaybeArray<ArgumentProvider>
}

export interface ExecutionContext<TEvent extends Event = Event> extends BareExecutionContext<TEvent> {
  id: string
  index: number
  priority: number
  //
  object: StrictObjectReference
  //
  listenerID: string
}

export interface ExplainExecutionContextOptions {
  object: ObjectReference
  queue: CallQueue
  controller: ObjectController
}

/** Convert all arguments in an execution context to a hash */
export function hashExecutionContextArguments(bareExecutionContext: BareExecutionContext): string[] {
  const _arguments: string[] = []
  for (const [key, value] of Object.entries(bareExecutionContext.hashableArguments ?? {})) {
    let hash: string

    if (isPrimitive(value)) hash = String(value)
    else if (Reference.isReference(value) || PropertyReference.isPropertyReference(value)) hash = value.toString()
    else if (has(value, `expression`) && has(value, `target`)) hash = `${value.expression}|${value.target}` // ProcessingPath
    else if (has(value, `id`)) hash = value.id // Generic (anything with an id)
    else if (has(value, `name`)) hash = value.name // Generic (anything with a name)
    else throw new Error(`Implement hashing for this`)

    _arguments.push(`${key}:${hash}`)
  }

  return _arguments
}

/** Get unique execution context ID */
export function getExecutionContextID(strictObject: StrictObjectReference, bareExecutionContext: BareExecutionContext): ExecutionContext[`id`] {
  const _arguments = hashExecutionContextArguments(bareExecutionContext).join(`,`)

  return `${strictObject.toString()}::${bareExecutionContext.name}${_arguments === `` ? `` : `:${_arguments}`}`
}

export function explainExecutionContext(executionContext: ExecutionContext, { object, queue, controller }: Partial<ExplainExecutionContextOptions> = {}): Block[] {
  const blocks: Block[] = []

  // 1. Push basics
  blocks.push(paint.identity.bold((object ?? executionContext.object).toString()))

  const [_object] = controller?.store.getByReference(object ?? executionContext.object, false) ?? []
  if (_object) {
    const name: string = get(_object, `data.name`) ?? get(_object, `data._.GCA.name`)
    if (name && name !== ``) blocks.push(paint.identity(` `), paint.grey(name))

    const aliases: string[] = get(_object, `data.__.aliases`)
    if (aliases && aliases.length > 0) blocks.push(paint.dim.grey(` (${aliases.join(`, `)})`))
  }

  blocks.push(
    //
    paint.identity(` `),
    paint.magenta.dim.italic(executionContext.name),
    paint.identity(` `),
  )

  // 2. Unshift queue stuff
  if (queue) {
    const prioColor = executionContext.priority === Infinity ? paint.dim : paint.identity
    const indexColor = executionContext.priority !== Infinity ? paint.dim : paint.identity

    blocks.unshift(
      ...paint.dim(queue.toString(), `, `), //
      prioColor(executionContext.priority === Infinity ? `∞` : executionContext.priority),
      paint.grey.dim(`#`),
      indexColor(executionContext.index),
      ...paint.dim(`/${queue.queue.size}`, ` `),
    )
  }

  // 3. Push arguments
  const _arguments: Block[][] = []
  const allArguments = { ...(executionContext.hashableArguments ?? {}), ...(executionContext.otherArguments ?? {}) }
  const keys = Object.keys(allArguments)
  const values = hashExecutionContextArguments(executionContext)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = values[i]

    // (other argument)
    if (value === undefined) _arguments.push([paint.identity.italic(key)])
    else {
      // (hashable argument)
      _arguments.push([
        paint.blue(key), //
        paint.dim.grey(`:`),
        paint.dim(value.toString().replace(`${key}:`, ``)) as any,
      ])
    }
  }

  if (_arguments.length > 0) {
    blocks.push(paint.dim.grey(`{ `))
    blocks.push(...arrayJoin(_arguments, paint.dim.grey(`, `)).flat())
    blocks.push(paint.dim.grey(` }`))
  }

  return blocks
}
