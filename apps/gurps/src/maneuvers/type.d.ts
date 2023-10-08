import * as cnormand from "gurps/module/actor/maneuver"
import { Maneuver } from "./index"

// eslint-disable-next-line quotes
declare module "gurps/module/actor/maneuver" {
  export namespace Maneuvers {
    const getAll: () => Record<Maneuver, cnormand.Maneuver>
    const getAllData: () => Record<Maneuver, cnormand.Maneuver>
  }
}
