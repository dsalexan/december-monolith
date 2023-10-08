/**
 * Set of formalities for a FoudryVTT module structure
 */

import { EventEmitter } from "@billjs/event-emitter"

export type ModuleOptions = {
  skipLoad: boolean
}

export default class Module extends EventEmitter {
  /**
   * Listen to all appropriate events across the board
   */
  listen() {}
}
