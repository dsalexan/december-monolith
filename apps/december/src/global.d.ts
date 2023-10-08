import * as _ from "lodash"

import { ExtendedGURPSStatic } from "@december/gurps"

declare global {
  let get: typeof _.get

  let GURPS: ExtendedGURPSStatic

  interface Window {
    get: typeof _.get

    GURPS: ExtendedGURPSStatic
  }
}
