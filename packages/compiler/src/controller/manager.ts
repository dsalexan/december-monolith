import { EventEmitter } from "@billjs/event-emitter"
import { Nullable } from "tsdef"

import type ObjectController from "."

export interface IObjectManager {
  controller: ObjectController
  //
  debug(state: Nullable<boolean>): this
  listen: () => void
}

export class ObjectManager implements IObjectManager {
  protected __DEBUG: boolean = true
  //
  public controller: ObjectController

  constructor(controller: ObjectController) {
    this.controller = controller
  }

  public debug(state: Nullable<boolean> = null) {
    const _state = state === null ? !this.__DEBUG : state
    this.__DEBUG = _state

    return this
  }

  public listen() {
    // do nothing by default
  }
}

export class ObjectManagerEmitter extends EventEmitter implements IObjectManager {
  protected __DEBUG: boolean = true
  //
  public controller: ObjectController

  constructor(controller: ObjectController) {
    super()
    this.controller = controller
  }

  public debug(state: Nullable<boolean> = null) {
    const _state = state === null ? !this.__DEBUG : state
    this.__DEBUG = _state

    return this
  }

  public listen() {
    // do nothing by default
  }
}
