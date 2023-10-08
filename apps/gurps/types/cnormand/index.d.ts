// import type { StoredDocument } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils"

import type { GurpsActor as GURPSActor } from "gurps/module/actor"
import type { Types } from "@december/foundry"
import type GURPS4eGameAid from "../../src"
import { Maneuver } from "./actor/maneuver"

declare global {
  namespace GURPS {
    let EXTENSION: GURPS4eGameAid

    let GurpsActor: typeof GURPSActor
    // let GurpsToken: typeof GURPSToken

    // Expose Maneuvers to make them easier to use in modules
    let Maneuvers: typeof Maneuver

    // Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
    let LastActor: GURPSActor | null

    function SetLastActor(actor: Types.StoredDocument<GURPSActor>, tokenDocument: Token): void
    function ClearLastActor(actor: GURPSActor): void

    let GurpsMobileActorSheet_rendered: boolean
    let GurpsMobileActorSheet_root: unknown | null

    /* -------------------------------------------- */
    /*  Foundry VTT Initialization                  */
    /* -------------------------------------------- */
    // Hooks.once('init', async function () {
    // rangeObject: typeof GURPSRan

    // remembers last acessed actor, but value is not used com modifier bucket
    let LastAccessedActor: Types.StoredDocument<GURPSActor> | null
  }
}
