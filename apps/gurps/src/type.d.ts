import { GURPSStatic } from "gurps"

import { Types } from "@december/foundry"

import GURPS4eGameAid from "."

export interface ExtendedGURPSStatic extends GURPSStatic {
  EXTENSION: GURPS4eGameAid

  __remaped_functions: Record<string, (...args: any[]) => any> | undefined

  ICONS: Record<string, string>
  _cache: Record<string, any>

  // Weave custom maneuvers inside
  // Maneuvers: typeof Maneuvers

  // let GurpsMobileActorSheet_rendered: boolean
  // let GurpsMobileActorSheet_root: unknown | null

  /* -------------------------------------------- */
  /*  Foundry VTT Initialization                  */
  /* -------------------------------------------- */
  // Hooks.once('init', async function () {
  // rangeObject: typeof GURPSRan

  // remembers last acessed actor, but value is not used com modifier bucket
  LastAccessedActor: Actor | null
}
