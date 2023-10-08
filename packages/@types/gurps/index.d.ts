import { Maneuvers } from "./module/actor/maneuver.d"

// eslint-disable-next-line quotes
declare module "gurps" {
  // tslint:disable-next-line no-empty-interface (This will be augmented)
  export interface GURPSStatic {
    // let GurpsActor: typeof GURPSActor
    // let GurpsToken: typeof GURPSToken

    // Expose Maneuvers to make them easier to use in modules
    Maneuvers: typeof Maneuvers

    // Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
    LastActor: Actor | null

    SetLastActor(actor: Actor, tokenDocument: Token): void
    ClearLastActor(actor: Actor): void
  }
}
