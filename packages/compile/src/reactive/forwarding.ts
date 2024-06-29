import { cloneDeep, isNil } from "lodash"

import { isNilOrEmpty } from "@december/utils"

import { ReactionReference } from "../reference"
import { Parity } from "./parity"
import { generateReactionHash, ReactionTarget } from "./reaction"
import { ReactionContext } from "./reaction/context"
import { IndexedReactionTarget } from "./reaction/definition"
import * as Utils from "../reference/utils"
import ReactiveCompilationManager from "./manager"
import ReactiveIndexation from "./manager/indexation"

export class ForwardingInstruction {
  object: string // strict object reference === object id === target object to run reaction on
  watchlist: IndexedReactionTarget[] // list of targets to look for updates
  reaction: ReactionReference // reference to reaction definition (we only really need the processing function from the reaction definition)
  context: ReactionContext // relevant context to run processing on

  // validation
  hash: string // uniq instruction identifier, to avoid repeating instructions
  parity: Parity // parity data to determine if the instruction is still valid

  constructor(objectID: string, reaction: ReactionReference, context: ReactionContext, parity: Parity) {
    this.object = objectID
    this.watchlist = []
    this.reaction = reaction
    this.context = context
    //
    this.parity = parity
  }

  _generateHash() {
    const isEmptyContext = isNil(this.context) || Object.keys(this.context).length === 0
    // probably context doesnt matter for instruction id, up in the air

    const watchlist = [] as string[]
    for (const target of this.watchlist) {
      const _policy = target.policy === `always` ? `` : `${target.policy}//`
      const _object = target.type === `event` ? `event` : Utils.Object.flatten(target.property.object)
      const _path = target.type === `event` ? target.name : String(target.property.path)

      watchlist.push(`${_policy}${_object}:${_path}`)
    }
    watchlist.sort()

    // based on reaction hash
    const _reaction = generateReactionHash({ reference: this.reaction, trigger: [], context: this.context })
    const hash = `${this.object}:::${_reaction}:::${watchlist.join(`,`)}`

    if (!isNilOrEmpty(hash)) debugger
    this.hash = hash
  }

  /** Add target to watch (i.e. forward to reaction when target is updated) */
  add(target: ReactionTarget) {
    const index = this.watchlist.length
    const indexedTarget: IndexedReactionTarget = { ...cloneDeep(target), index }

    this.watchlist.push(indexedTarget)
    this._generateHash()

    return this
  }

  validate() {
    // ERROR: Instruction needs parity
    if (!this.parity) debugger

    // ERROR: There is no reason for a forwarding instruction to have no targets
    if (!this.watchlist.length) debugger

    // ERROR: Instruction needs an hash to detect repeating instructions
    if (!this.hash) debugger

    return true
  }
}

export class ForwardingManager {
  manager: ReactiveCompilationManager

  instructions: Map<string, ForwardingInstruction> = new Map() // hash => instruction
  _: ReactiveIndexation

  constructor(manager: ReactiveCompilationManager) {
    this.manager = manager
    this._ = new ReactiveIndexation(manager)
  }

  /** Creates new forwarding instruction */
  make(parity: Parity, objectID: string, reaction: ReactionReference, context: ReactionContext, ...targets: ReactionTarget[]) {
    const instruction = new ForwardingInstruction(objectID, reaction, context, parity)
    for (const target of targets) instruction.add(target)

    return instruction
  }

  /** Adds forwarding instruction to manager */
  add(instruction: ForwardingInstruction) {}
}
