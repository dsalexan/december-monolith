import type December from "@december/december"
import type Mobile from "@december/mobile"
import type GurpsMobileCore from "./core"

declare global {
  let DECEMBER: December
  let MOBILE: Mobile
  let GURPS_MOBILE: GurpsMobileCore

  interface Window {
    DECEMBER: December
    MOBILE: Mobile
    GURPS_MOBILE: GurpsMobileCore
  }
}
