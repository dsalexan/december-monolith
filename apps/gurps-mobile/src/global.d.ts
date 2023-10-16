import type December from "@december/december"
import type Mobile from "@december/mobile"
import { ExtendedGURPSStatic } from "@december/gurps"

import type GurpsMobileCore from "./core"

interface GurpsMobileExtendedGURPSStatic extends ExtendedGURPSStatic {
  // ModifierBucket: GurpsMobileModifierBucket
}

declare global {
  const BUILD_MODE: `development` | `production`
  const TEMPLATES: string[]

  let DECEMBER: December
  let MOBILE: Mobile
  let GURPS_MOBILE: GurpsMobileCore

  let GURPS: GurpsMobileExtendedGURPSStatic

  interface Window {
    DECEMBER: December
    MOBILE: Mobile
    GURPS_MOBILE: GurpsMobileCore

    GURPS: GurpsMobileExtendedGURPSStatic

    // hmr
    _hot_ready: boolean
  }

  /* -------------------------------------------- */
  /*  HTML Template Loading                       */
  /* -------------------------------------------- */

  // Global template cache
  // eslint-disable-next-line @typescript-eslint/ban-types
  const _templateCache: Record<string, Function>
}
