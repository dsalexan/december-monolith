import assert from "assert"
import { Mutation } from "../mutation/mutation"
import { ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../object"

import { numberToLetters } from "@december/utils"

import churchill, { Block, paint, Paint } from "../logger"
import type ObjectManager from "."

export const logger = churchill.child(`node`, undefined, { separator: `` })

export interface MutatorCommand {
  target: StrictObjectReference
  mutations: Mutation[]
  //
  _: {
    stack: string
    index: number
  }
}

export default class ObjectMutator {
  public manager: ObjectManager
  public queues: Map<string, MutatorCommand[]> = new Map()
  //
  public live: {
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

    this.queues.set(name, [])

    logger.add(paint.grey(`[queue] Making `)).add(paint.bold(name)).info()

    return name
  }

  /** Qeueue a mutation for an object */
  public enqueue(object: ObjectReference, ...mutations: Mutation[]) {
    if (this.queues.size === 0) this.makeQueue(`A`)

    const lastQueue = Array.from(this.queues.keys()).pop()
    assert(lastQueue, `No queue found`)

    let queue = lastQueue
    // if queue is running, create a new one
    if (lastQueue === this.live?.queue) queue = this.makeQueue(numberToLetters(this.queues.size).toUpperCase())

    // TODO: Check if the tuple (object, mutations) is already in the queue

    logger
      .add(paint.grey(`[`))
      .add(paint.yellow.dim(`enqueue`))
      .add(paint.grey(`] ${queue} `))
      .add(paint.bold(object.toString()))
      .add(paint.grey(` (`))
      .add(mutations.length)
      .add(paint.grey(` mutations)`))

    logger
      .add(` `)
      .add(paint.bold(mutations[0].type))
      .add(` `) //
      .add(paint.dim(mutations[0].property))
      .add(` `) //
      .add(paint.grey.italic.dim(mutations[0].value))

    logger.info()

    this._enqueue(queue, object, mutations)
  }

  private _enqueue(name: string, object: ObjectReference, mutations: Mutation[]) {
    assert(this.queues.has(name), `Queue "${name}" does not exist`)

    const queue = this.queues.get(name)!

    let target: StrictObjectReference = this.manager.strictifyReference(object)

    const command: MutatorCommand = {
      _: {
        stack: name,
        index: queue.length,
      },
      //
      target,
      mutations,
    }

    queue.push(command)
  }

  /** Run queues  */
  public run() {
    logger.add(paint.grey(`[run] ${this.queues.size} queues`)).info()

    for (const [name, queue] of this.queues.entries()) {
      this.live = { queue: name, command: -1 }

      const commands = [...queue.entries()]
      for (const [i, command] of commands) {
        this.live.command = i

        logger
          .add(paint.grey(`[`))
          .add(paint.green.dim.grey(`run`))
          .add(paint.grey(`] ${name} `))
          .add(i)
          .add(paint.gray(`/${commands.length - 1}`))

        logger
          .add(` `)
          .add(paint.bold(command.target.toString()))
          .add(` `)
          .add(paint.blue.bold.dim(command.mutations[0].type))
          .add(` `) //
          .add(paint.dim(command.mutations[0].property))
          .add(` `) //
          .add(paint.grey.italic.dim(command.mutations[0].value))

        logger.info()

        this._runCommand(command)
      }
    }

    this.reset()
  }

  private _runCommand(command: MutatorCommand) {
    const object = this.manager.objects.getByStrictReference(command.target)!

    object.update(command.mutations)
  }
}
