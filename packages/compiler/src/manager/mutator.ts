import assert from "assert"
import { Mutation } from "../mutation/mutation"
import { ObjectReference, STRICT_OBJECT_TYPES, StrictObjectReference } from "../object"

import { numberToLetters } from "@december/utils"

import churchill, { Block, paint, Paint } from "../logger"
import type ObjectManager from "."
import { isArray } from "lodash"

export const logger = churchill.child(`node`, undefined, { separator: `` })

export interface MutationGenerator {
  name: string
  fn: () => Mutation | Mutation[]
}

export interface MutatorCommand {
  id: string
  target: StrictObjectReference
  generator: MutationGenerator // MutationGenerator = (???) => Mutation[]
  //
  _: {
    stack: string
    index: number
  }
}

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

  public unqueue(object: ObjectReference, generatorName: MutationGenerator[`name`]) {
    if (this.queues.size === 0) return

    const queues = [...this.queues.keys()]
    for (const [queueIndex, queue] of queues.entries()) {
      if (this.live && queueIndex < this.live.queueIndex) continue

      this._unqueue(queue, object, generatorName)
    }
  }

  public _unqueue(name: string, object: ObjectReference, generatorName: MutationGenerator[`name`]) {
    assert(this.queues.has(name), `Queue "${name}" does not exist`)

    const queue = this.queues.get(name)!
    const currentCommandIndex = this.live?.queue === name ? this.live.command : -1

    let target: StrictObjectReference = this.manager.strictifyReference(object)
    const commandID = `${target.toString()}:${generatorName}`

    const commandIndex = Array.from(queue.keys()).findIndex(id => id === commandID)

    if (commandIndex === -1) return

    if (commandIndex <= currentCommandIndex) {
      logger
        .add(paint.grey(`[`))
        .add(paint.red.dim(`unqueue/`))
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
        .add(paint.italic.grey(`(command was already executed)`))

      logger.info()
    } else {
      logger
        .add(paint.grey(`[`))
        .add(paint.yellow.dim(`unqueue`))
        .add(paint.grey(`] ${name} `))
        .add(commandIndex)
        .add(paint.gray(`/${queue.size - 1}`))

      logger
        .add(` `)
        .add(paint.bold(object.toString()))
        .add(` `) //
        .add(paint.blue.bold.dim(generatorName))

      logger.info()

      queue.delete(commandID)
    }
  }

  /** Qeueue a mutation for an object */
  public enqueue(object: ObjectReference, generator: MutationGenerator) {
    if (this.queues.size === 0) this.makeQueue(`A`)

    const lastQueue = Array.from(this.queues.keys()).pop()
    assert(lastQueue, `No queue found`)

    let queue = lastQueue
    // if queue is running, create a new one
    if (lastQueue === this.live?.queue) queue = this.makeQueue(numberToLetters(this.queues.size).toUpperCase())

    this._enqueue(queue, object, generator)
  }

  private _enqueue(name: string, object: ObjectReference, generator: MutationGenerator) {
    assert(this.queues.has(name), `Queue "${name}" does not exist`)

    const queue = this.queues.get(name)!

    let target: StrictObjectReference = this.manager.strictifyReference(object)

    const command: MutatorCommand = {
      _: {
        stack: name,
        index: queue.size,
      },
      //
      id: `${target.toString()}:${generator.name}`,
      target,
      generator,
    }

    if (queue.has(command.id)) {
      logger
        .add(paint.grey(`[`))
        .add(paint.red.dim(`enqueue/skip`))
        .add(paint.grey(`] ${name} `))
        .add(paint.bold(object.toString()))
        .add(paint.grey(` `))
        .add(paint.white.bold.dim(generator.name))

      logger.info()
    } else {
      logger
        .add(paint.grey(`[`))
        .add(paint.yellow.dim(`enqueue`))
        .add(paint.grey(`] ${name} `))
        .add(paint.bold(object.toString()))
        .add(paint.grey(` `))
        .add(paint.blue.bold.dim(generator.name))

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

        logger
          .add(paint.grey(`[`))
          .add(paint.magenta.dim.grey(`run`))
          .add(paint.grey(`] ${name} `))
          .add(cursor)
          .add(paint.gray(`/${commands.length - 1}`))

        logger
          .add(` `)
          .add(paint.bold(command.target.toString()))
          .add(` `) //
          .add(paint.blue.bold.dim(command.generator.name))
          .add(` `)
          .add(paint.grey.dim.italic(command.id))

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
