import assert from "assert"
import { Mutation } from "../mutation/mutation"
import { ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../object"

import { numberToLetters } from "@december/utils"
import { PropertyReference } from "@december/utils/access"

import churchill, { Block, paint, Paint } from "../logger"
import type ObjectManager from "."
import { isArray, isString, orderBy, sortBy } from "lodash"
import { Event_Handle, Event_Listen, EventDispatched, EventTrace, explainEventTrace } from "./events/events"
import { MaybeUndefined } from "tsdef"

export const logger = churchill.child(`node`, undefined, { separator: `` })

export interface MutationGenerator {
  name: string
  fn: () => Mutation | Mutation[]
}

export const DYNAMIC_MUTATION_HASH = {
  EVENT_MATCH: Symbol.for(`DYNAMIC_MUTATION_HASH:EVENT_MATCH`),
  EVENT_DATA: Symbol.for(`DYNAMIC_MUTATION_HASH:EVENT_DATA`),
}
export type DynamicMutationHash = (typeof DYNAMIC_MUTATION_HASH)[keyof typeof DYNAMIC_MUTATION_HASH]
export type MutationHash = string | DynamicMutationHash

export function isDynamicMutationHash(hash: MutationHash | undefined): hash is DynamicMutationHash {
  return !isString(hash) && hash !== undefined
}

export function getMutationHash(hash: MutationHash | undefined, mutationTrace: MutationTrace): MaybeUndefined<string> {
  if (isDynamicMutationHash(hash)) {
    if (hash === DYNAMIC_MUTATION_HASH.EVENT_MATCH) {
      const trace = mutationTrace.event.trace

      const _ = (hash: string) => `[*EVENT_MATCH]${hash}`
      if (trace.type === `cascade-update`) return _(trace.properties.map(property => PropertyReference.toString(trace.object, property)).join(`|`))

      throw new Error(`Event type "${mutationTrace.event.type}" or trace type "${trace.type}" for dynamic mutation hash not implemented`)
    } else if (hash === DYNAMIC_MUTATION_HASH.EVENT_DATA) {
      const data = mutationTrace.event.dispatcher.data ?? {}

      return `[*EVENT_DATA]${sortBy(Object.keys(data), key => key)
        .map(key => `${key}:${data[key]}`)
        .join(`|`)}`
    }

    throw new Error(`Dynamic mutation hash not implemented`)
  }

  return hash
}

export interface MutatorCommand {
  id: string
  target: StrictObjectReference
  generator: MutationGenerator // MutationGenerator = (???) => Mutation[]
  hash?: string
  //
  _: {
    stack: string
    index: number
  }
}

export function getMutatorCommandID(target: string, generatorName: string, mutationHash?: string) {
  const _mutationHash = mutationHash ? `::${mutationHash}` : ``
  return `${target}::${generatorName}${_mutationHash}`
}

export type MutationTrace = { event: EventDispatched }

export default class ObjectMutator {
  public manager: ObjectManager
  public queues: Map<string, Map<string, MutatorCommand>> = new Map()
  //
  public live: {
    queueIndex: number
    queue: string
    command: number
  } | null = null

  constructor(manager: ObjectManager) {
    this.manager = manager
  }

  reset() {
    this.queues.clear()
    this.live = null
  }

  public makeQueue(name: string) {
    assert(!this.queues.has(name), `Queue "${name}" already exists`)

    this.queues.set(name, new Map())

    logger.add(paint.grey(`[queue] Making `)).add(paint.bold(name)).info()

    return name
  }

  public dequeue(object: ObjectReference, generatorName: MutationGenerator[`name`], trace: MutationTrace, mutationHash?: MutationHash) {
    if (this.queues.size === 0) return

    const queues = [...this.queues.keys()]
    for (const [queueIndex, queue] of queues.entries()) {
      if (this.live && queueIndex < this.live.queueIndex) continue

      this._dequeue(queue, object, generatorName, trace, mutationHash)
    }
  }

  public _dequeue(name: string, object: ObjectReference, generatorName: MutationGenerator[`name`], trace: MutationTrace, mutationHash?: MutationHash) {
    assert(this.queues.has(name), `Queue "${name}" does not exist`)

    const queue = this.queues.get(name)!
    const currentCommandIndex = this.live?.queue === name ? this.live.command : -1

    let target: StrictObjectReference = this.manager.strictifyReference(object)

    // TODO: Figure out how to handle dynamic hash conversion in dequeue
    if (isDynamicMutationHash(mutationHash)) debugger

    const hash = getMutationHash(mutationHash, null as any)
    const commandID = getMutatorCommandID(target.toString(), generatorName, hash)

    const commandIndex = Array.from(queue.keys()).findIndex(id => id === commandID)

    if (commandIndex === -1) return

    if (commandIndex <= currentCommandIndex) {
      logger
        .add(paint.grey(`[`))
        .add(paint.red.dim(`dequeue/`))
        .add(paint.red.dim.bold(`skip`))
        .add(paint.grey(`] ${name} `))
        .add(commandIndex)
        .add(paint.gray(`/${queue.size - 1}`))

      logger
        .add(` `)
        .add(paint.bold(object.toString()))
        .add(` `) //
        .add(paint.blue.bold.dim(generatorName))
        .add(` `)
      if (hash) logger.add(paint.grey.dim(hash)).add(` `)

      logger.add(paint.italic.grey(`(command was already executed)`))

      explainMutationTrace(logger, trace)

      logger.info()
    } else {
      logger
        .add(paint.grey(`[`))
        .add(paint.yellow.dim(`dequeue`))
        .add(paint.grey(`] ${name} `))
        .add(commandIndex)
        .add(paint.gray(`/${queue.size - 1}`))

      logger
        .add(` `)
        .add(paint.bold(object.toString()))
        .add(` `) //
        .add(paint.blue.bold.dim(generatorName))
        .add(` `)
      if (hash) logger.add(paint.grey.dim(hash)).add(` `)

      explainMutationTrace(logger, trace)

      logger.info()

      queue.delete(commandID)
    }
  }

  /** Qeueue a mutation for an object */
  public enqueue(object: ObjectReference, generator: MutationGenerator, trace: MutationTrace, mutationHash?: MutationHash) {
    if (this.queues.size === 0) this.makeQueue(`A`)

    const lastQueue = Array.from(this.queues.keys()).pop()
    assert(lastQueue, `No queue found`)

    let queue = lastQueue
    // if queue is running, create a new one
    if (lastQueue === this.live?.queue) queue = this.makeQueue(numberToLetters(this.queues.size).toUpperCase())

    this._enqueue(queue, object, generator, trace, mutationHash)
  }

  private _enqueue(name: string, object: ObjectReference, generator: MutationGenerator, trace: MutationTrace, mutationHash?: MutationHash) {
    assert(this.queues.has(name), `Queue "${name}" does not exist`)

    const queue = this.queues.get(name)!

    let target: StrictObjectReference = this.manager.strictifyReference(object)
    const hash = getMutationHash(mutationHash, trace)

    const command: MutatorCommand = {
      _: {
        stack: name,
        index: queue.size,
      },
      //
      id: getMutatorCommandID(target.toString(), generator.name, hash),
      target,
      generator,
      hash,
    }

    // check if it is already in some future queue
    let doSkip = false

    const queues = [...this.queues.keys()]
    for (const [queueIndex, queueName] of queues.entries()) {
      if (this.live && queueIndex < this.live.queueIndex) continue

      const queue = this.queues.get(queueName)!
      if (queue.has(command.id)) {
        if (this.live) {
          const commandIndex = Array.from(queue.keys()).findIndex(id => id === command.id)
          if (commandIndex < this.live.command) continue
        }

        doSkip = true
      }
    }

    if (doSkip) {
      logger
        .add(paint.grey(`[`))
        .add(paint.red.dim(`enqueue/`))
        .add(paint.red.dim.bold(`skip`))
        .add(paint.grey(`] ${name} `))
        .add(paint.bold(object.toString()))
        .add(paint.grey(` `))
        .add(paint.white.bold.dim(generator.name))
        .add(paint.grey(` `))
      if (hash) logger.add(paint.grey.dim(hash)).add(` `)

      explainMutationTrace(logger, trace)

      logger.info()
    } else {
      logger
        .add(paint.grey(`[`))
        .add(paint.yellow.dim(`enqueue`))
        .add(paint.grey(`] ${name} `))
        .add(paint.bold(object.toString()))
        .add(paint.grey(` `))
        .add(paint.blue.bold.dim(generator.name))
        .add(paint.grey(` `))
      if (hash) logger.add(paint.grey.dim(hash)).add(` `)

      explainMutationTrace(logger, trace)

      logger.info()

      queue.set(command.id, command)
    }
  }

  /** Run queues  */
  public run() {
    logger.add(paint.grey(`[run] ${this.queues.size} queues`)).info()

    let queueIndex = 0
    for (const [name, queue] of this.queues.entries()) {
      this.live = { queueIndex: queueIndex++, queue: name, command: -1 }

      const commands = [...queue.entries()]
      let cursor = -1
      for (const [i, command] of commands) {
        this.live.command = ++cursor

        // if (command.generator.name === `compute:bonus`) debugger

        logger
          .add(paint.grey(`[`))
          .add(paint.magenta.dim.grey(`run`))
          .add(paint.grey(`] ${name} `))
          .add(cursor)
          .add(paint.gray(`/${commands.length}`))

        logger
          .add(` `)
          .add(paint.bold(command.target.toString()))
          .add(` `) //
          .add(paint.blue.bold.dim(command.generator.name))
          // .add(` `)
          // .add(paint.grey.dim.italic(command.id))
          .add(` `)
        if (command.hash) logger.add(paint.grey.dim(command.hash)).add(` `)

        logger.info()

        this._runCommand(command)
      }
    }

    this.reset()
  }

  private _runCommand(command: MutatorCommand) {
    const object = this.manager.objects.getByStrictReference(command.target)!

    const _mutations = command.generator.fn()
    const mutations: Mutation[] = isArray(_mutations) ? _mutations : [_mutations]

    object.update(mutations)
  }
}

export function explainMutationTrace(builder: typeof logger, trace: MutationTrace) {
  if ([`cascade-update`, `reference`, `signature-changed`].includes(trace.event.trace.type)) return explainEventTrace(builder, trace.event.trace)

  throw new Error(`Unimplemented mutation trace`)
}
