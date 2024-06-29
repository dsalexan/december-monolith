import { EventEmitter } from "@billjs/event-emitter"
import { get, findIndex, groupBy, uniq, isNil, isEqual, isArray, orderBy, has, uniqBy, cloneDeep } from "lodash"

import { Builder, paint } from "@december/logger"
import { arrayJoin, isNilOrEmpty } from "@december/utils"

import AliasManager, { AliasIndexedEvent } from "../alias"
import { CompilationInstruction } from "./newInstruction"
import ReactiveCompilableObject from "../reactive/object"
import { UpdateEvent } from "../object"
import { completeInstructionIndex } from "../instruction/fast"
import { ReactionHistory } from "../reactive/reaction/context"
import { Reaction } from "../reactive/reaction"
import { CompilationStack } from "./stack"
import { ExplicitPropertyReference, ReactionInstructionReference, StrictObjectReference } from "../reference"

export default class CompilationManager extends EventEmitter {
  // number of operations on object referential indexes
  objectReferentialOperations = { current: 0, previous: 0 }
  logger: Builder

  objects: Record<string, ReactiveCompilableObject> = {} // index all reactive compilable objects
  clusters: Record<string, string[]> = {} // index all objects by cluster

  // compilation
  _stacks: CompilationStack[] = [] // stacks of compilation instructions to be run
  _currentStack = -1 // current stack index running
  _history: Record<string, Record<string, ReactionHistory>> = {} // object id -> reaction pointer (as string) -> triggers[]

  constructor(logger: Builder) {
    super()

    this.logger = logger.clone()
  }

  // #region OBJECTS

  getObject(id: string) {
    return this.objects[id]
  }

  getObjects(clusterOrID: string) {
    if (this.objects[clusterOrID]) return this.objects[clusterOrID]
    if (this.clusters[clusterOrID]) return this.clusters[clusterOrID].map(id => this.objects[id])

    return null
  }

  // overridable method
  _addObject(object: ReactiveCompilableObject, cluster?: string) {
    // ERROR: There should not be two objects with the same id
    if (this.objects[object.id]) debugger

    // ERROR: Object is already managed
    if (object.manager) debugger
    object.manager = this

    // INITIALIZE INDEXES
    this.objects[object.id] = object
    this._history[object.id] = {} // reaction pointer (as string) -> triggers[]

    if (cluster) {
      if (!this.clusters[cluster]) this.clusters[cluster] = []
      if (!this.clusters[cluster].includes(object.id)) this.clusters[cluster].push(object.id)
    }
  }

  addObject(object: ReactiveCompilableObject, cluster?: string) {
    this._addObject(object, cluster)

    // LISTEN TO OBJECT EVENTS
    this._listenObject(object)
  }

  _listenObject(object: ReactiveCompilableObject) {
    // compilation manager doesnt really listen to anything here
  }

  // #endregion

  // #region INSTRUCTIONS

  stack(index: number, ...tags: string[]): CompilationStack {
    if (!this._stacks[index]) {
      const stack = new CompilationStack(this, index, tags)

      this._stacks[index] = stack
    }

    return this._stacks[index]
  }

  addInstruction(reaction: Reaction, targetStack: number | null | string = null) {
    const lastExistingStackIndex = (this._stacks.length === 0 ? 1 : this._stacks.length) - 1

    // 0. determine target stack
    let stackIndex = targetStack as number
    if (targetStack === null) stackIndex = lastExistingStackIndex
    else if (typeof targetStack === `string`) {
      // add new stack with tag (if it doesnt exist)
      stackIndex = findIndex(this._stacks, s => s.tags.includes(targetStack))
      // create new stack with stack if necessary
      if (stackIndex === -1) {
        stackIndex = this._stacks.length
        this.stack(this._stacks.length, targetStack)
      }
    }

    //        if target stack is running currently, try next one
    if (stackIndex === this._currentStack) stackIndex++

    // 1. instiantiate stack if necessary
    const stack = this.stack(stackIndex)

    // 2. make instruction
    const instruction = new CompilationInstruction(reaction)

    // 3. try to add instruction to stack
    const result = stack.push(instruction)

    return result
  }

  validateInstruction(instruction: CompilationInstruction) {
    // nothing here, override if necessary
    return true
  }

  // #endregion

  compile() {
    this.logger.add(`Starting Compilation...`).debug()

    // recursive "infinite" call until there is no more stacks to compile
    const STACK_OVERFLOW_PROTECTION = 100
    for (let i = 0; i < STACK_OVERFLOW_PROTECTION; i++) {
      this._compile()

      // check if there are stacks to compile
      const stacksToCompile = this._stacks.length - 1 - this._currentStack
      if (stacksToCompile <= 0) break
    }

    // reset stacks
    this._stacks = []
    this._currentStack = -1
  }

  _compile() {
    let workWasDone = false

    for (let i = this._currentStack + 1; i < this._stacks.length; i++) {
      this.logger.tab()

      workWasDone = this._compileStack(i) || workWasDone

      this.logger.tab(-1)
    }

    return workWasDone
  }

  _compileStack(stackIndex: number) {
    this._currentStack = stackIndex
    const stack = this._stacks[stackIndex] // dont create a new stack, it should already exist

    return stack.compile()
  }
}
