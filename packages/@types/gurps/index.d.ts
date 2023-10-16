import { ModifierBucketEditor } from "gurps/module/modifier-bucket/tooltip-window"
import { ModifierBucket } from "gurps/module/modifier-bucket/bucket-app"
import { GurpsActorSheet } from "gurps/module/actor/actor-sheet"
import { GurpsActor } from "gurps/module/actor/actor"
import { Maneuver, Maneuvers } from "gurps/module/actor/maneuver"

import ManeuverHUDButton from "gurps/module/actor/maneuver-button"

// eslint-disable-next-line quotes
declare module "gurps" {
  // tslint:disable-next-line no-empty-interface (This will be augmented)
  export interface GURPSStatic {
    GurpsActor: typeof GurpsActor
    // let GurpsToken: typeof GURPSToken

    // Expose Maneuvers to make them easier to use in modules
    Maneuvers: typeof Maneuvers
    // 		do the same for this root Hooks fellas
    Maneuver: typeof Maneuver
    GurpsActor: typeof GurpsActor
    ManeuverHUDButton: typeof ManeuverHUDButton
    GurpsActorSheet: typeof GurpsActorSheet

    ModifierBucketEditorClass: typeof ModifierBucketEditor
    ModifierBucketClass: typeof ModifierBucket
    ModifierBucket: ModifierBucket

    // Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
    LastActor: Actor | null

    SetLastActor(actor: Actor, tokenDocument: Token): void
    ClearLastActor(actor: Actor): void
  }
}
