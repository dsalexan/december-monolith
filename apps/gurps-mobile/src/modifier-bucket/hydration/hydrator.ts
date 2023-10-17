import { Hydrator, HydratorProperties } from "@december/foundry/hydration"

export type { default as ModifierBucketHTMLHydrationManager } from "./manager"

import ModifierBucketHTMLHydrationManager from "./manager"

export default class SheetHydrator<TProperties extends HydratorProperties = Record<string, never>> extends Hydrator<TProperties> {
  get manager(): ModifierBucketHTMLHydrationManager {
    return super.manager as ModifierBucketHTMLHydrationManager
  }

  get bucket() {
    return this.manager.bucket
  }
}
