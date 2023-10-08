import { GURPSStatic } from "gurps"

import GURPS4eGameAid from "."
import { ExtendedGURPSStatic } from "./type"

// // eslint-disable-next-line quotes
// declare module "gurps/actor/maneuver" {
//   interface Maneuvers {
//     createManeuver(data: boolean): string
//   }
// }

declare global {
  let GURPS: ExtendedGURPSStatic

  interface Window {
    GURPS: ExtendedGURPSStatic
  }
}
