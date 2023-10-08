import type December from "@december/december"
import type Mobile from "@december/mobile"
import { ExtendedGURPSStatic } from "@december/gurps"

import type GurpsMobileCore from "./core"

declare global {
  let DECEMBER: December
  let MOBILE: Mobile
  let GURPS_MOBILE: GurpsMobileCore

  let GURPS: ExtendedGURPSStatic

  interface Window {
    DECEMBER: December
    MOBILE: Mobile
    GURPS_MOBILE: GurpsMobileCore

    GURPS: ExtendedGURPSStatic
  }
}
