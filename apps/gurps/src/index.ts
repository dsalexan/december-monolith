import "./styles/index.scss"

import { set, get } from "local-storage"
import { isString } from "lodash"

import { Module, Types } from "@december/foundry"

import logger, { paint } from "./logger"
import { MODULE_ID } from "../config"

import { ExtendManeuvers } from "./maneuvers"

import type { GurpsActor } from "gurps/module/actor"

export default class GURPS4eGameAid extends Module {
  HOST_MODULE_ID: string

  constructor(hostModuleID: string) {
    super()

    // FIXME: Mobile should, at least in theory, works as a standalone module
    //        Of course it is not, would be too much trouble to make it so.
    if (hostModuleID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)
    this.HOST_MODULE_ID = hostModuleID
  }

  override listen() {
    super.listen()

    Hooks.on(`init`, this.onInit.bind(this))
    Hooks.on(`ready`, this.onReady.bind(this))

    Hooks.on(`gurpsinit`, this.onGurpsInit.bind(this))
  }

  onLoad() {
    this.listen()
  }

  onInit() {
    logger.add(`Initializing module extension `, paint.bold(MODULE_ID), ` ...`).info()
    // here is executed AFTER onGurpsInit, so it wouldnt be much of a initialization
    //    since "gurps" run before "gurps-mobile", which is just interestings
  }

  onReady() {
    const lastAcessedActorId = get<string>(`GURPS.LastAccessedActor`)
    this.setLastAccessedActor(lastAcessedActorId)
  }

  // #region GURPS (cnormand)

  onGurpsInit() {
    this.extend()
  }

  // #endregion

  // #region METHODS

  private extend() {
    logger.add(`Extending GURPS 4e Game Aid (cnormand)...`).info()

    // GURPS.ICONS = GURPSIcons as Record<string, string>
    GURPS._cache = {}

    if (this.HOST_MODULE_ID === undefined) throw new Error(`[${MODULE_ID}] GURPS 4e Game Aid (Extension) needs a host module to attach itself (HOST_MODULE_ID is empty)`)
    else ExtendManeuvers(this.HOST_MODULE_ID)

    this.remap()
  }

  private remap() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    if (GURPS.__remaped_functions === undefined) {
      const fns = {} as Record<string, (...args: any[]) => any>

      fns[`SetLastActor`] = GURPS.SetLastActor
      GURPS.SetLastActor = function (actor: Types.StoredDocument<Actor>, tokenDocument: Token) {
        // console.trace(`SETTING LAST ACTOR RENDER???`, actor, tokenDocument)
        fns[`SetLastActor`](actor, tokenDocument)
        Hooks.call(`gurps:set-last-actor`, actor, tokenDocument)

        self.setLastAccessedActor(actor)
      }

      GURPS.__remaped_functions = fns
    } else {
      throw new Error(`GURPS already had its functions remaped`)
    }
  }

  // #endregion

  // #region API

  setLastAccessedActor(actor: Types.StoredDocument<GurpsActor | Actor> | string | null) {
    let _actor: Types.StoredDocument<GurpsActor> | null = actor as any

    if (isString(actor)) _actor = (game.actors?.find(a => a.id === actor) || null) as Types.StoredDocument<GurpsActor> | null

    GURPS.LastAccessedActor = _actor
    set(`GURPS.LastAccessedActor`, _actor?.id) // local storage
    if (GURPS.LastAccessedActor) Hooks.call(`${MODULE_ID}:set-last-accessed-actor`, GURPS.LastAccessedActor)
  }

  // #endregion
}

export type { ExtendedGURPSStatic } from "./type"
