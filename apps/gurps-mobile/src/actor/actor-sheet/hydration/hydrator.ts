import { Hydrator, HydratorProperties } from "@december/foundry/hydration"

export type { default as SheetHTMLHydrationManager } from "./manager"

import SheetHTMLHydrationManager from "./manager"

export default class SheetHydrator<TProperties extends HydratorProperties = Record<string, never>> extends Hydrator<TProperties> {
  get manager(): SheetHTMLHydrationManager {
    return super.manager as SheetHTMLHydrationManager
  }

  get sheet() {
    return this.manager.sheet
  }
}
