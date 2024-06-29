/**
 * What is an ALIAS?
 *    It is a secondary way to identify a object.
 *    Once compiled a object can generate a "alias" (usually at _.aliases), which is indexed by an AliasManager.
 *    This alias can be used to reference the object when it's id is unknown (since more readable names are used on most human-made formulas, instead of a numerical id).
 */

import { EventEmitter } from "@billjs/event-emitter"
import type { CompilationManager } from ".."

export default class AliasManager extends EventEmitter {
  compilationManager: CompilationManager

  /**
   * ready — aliases are ready to be used
   * pending — there are pending aliases to be added to index
   * processing — pending aliases are being processed
   */
  state: `ready` | `pending` | `processing` = `ready`

  _pending: PendingAlias[] = [] // (alias key, object id)
  _pendingEvents: AliasEvent[] = []

  operations: number = 0 // hash to determine if therre were any changes to the indexed
  objectIDsByAlias: Record<string, string[]> = {} // alias key -> trait ids
  aliasesByObjectID: Record<string, string[]> = {} // trait ids -> alias key

  constructor(compilationManager: CompilationManager) {
    super()

    this.compilationManager = compilationManager
  }

  updateState(state: AliasManager[`state`]) {
    const previousState = this.state

    this.state = state
    this.fire(`state`, { previousState })
  }

  object(objectID: string) {
    return this.aliasesByObjectID[objectID]
  }

  get(key: string) {
    const objectIDs = this.objectIDsByAlias[key] ?? []

    return objectIDs.map(objectID => this.compilationManager.objects[objectID])
  }

  push(pendingAlias: PendingAlias) {
    // NOTE: Never tested this
    if (![`pending`, `ready`].includes(this.state)) debugger

    if (this.state !== `pending`) this.updateState(`pending`)

    this._pending.push(pendingAlias)
  }

  /** Process pending stack */
  process() {
    if (this._pending.length === 0) return (this.state = `ready`)

    this.updateState(`processing`)

    // process aliases
    let i = 0
    while (i < this._pending.length) {
      const pending = this._pending[i]

      let event: AliasEvent
      let aliasKey = pending.key

      if (pending.command === `add`) {
        const objectID = pending.objectID

        // index object id for fast access
        if (!this.objectIDsByAlias[aliasKey]) this.objectIDsByAlias[aliasKey] = []
        this.objectIDsByAlias[aliasKey].push(objectID)

        if (!this.aliasesByObjectID[objectID]) this.aliasesByObjectID[objectID] = []
        this.aliasesByObjectID[objectID].push(aliasKey)

        // event to notify that alias has been added/removed
        event = { event: `indexed`, data: { alias: aliasKey, object: objectID } }
      } else if (pending.command === `remove`) {
        event = null as any

        // NOTE: Never tested
        debugger
        // // get object tied to alias to remove it from index
        // const objectID = this.objectIDsByAlias[pending.key]

        // delete this.aliasesByObjectID[objectID]
        // delete this.objectIDsByAlias[pending.key]

        // TODO: How to handle event for remove alias?
        debugger
      } else {
        event = null as any

        // ERROR: Not implemented command
        debugger
      }

      this.operations++ // register operation
      this._pendingEvents.push(event)

      i++
    }

    // fire all pendinge events
    for (const { event, data } of this._pendingEvents) this.fire(event, data)

    // clear lists
    this._pending = []
    this._pendingEvents = []

    this.updateState(`ready`)
  }
}

// pending commands

export interface PendingAddAlias {
  command: `add`
  key: string
  objectID: string
}

export interface PendingRemoveAlias {
  command: `remove`
  key: string
}

type PendingAlias = PendingAddAlias | PendingRemoveAlias

// external events

export interface AliasIndexedEvent {
  event: `indexed`
  data: {
    alias: string
    object: string
  }
}

export interface AliasStateEvent {
  event: `state`
  data: {
    previousState: AliasManager[`state`]
  }
}

export type AliasEvent = AliasIndexedEvent | AliasStateEvent
