import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

export default class StackTraits extends SheetHydrator {
  tabs: TabsHydrator

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})

    this.tabs = new TabsHydrator(manager, {
      storageKey: `traits`,
      defaultTab: `attributes`,
    })
  }

  hydrate(html: JQuery<HTMLElement>): void {
    const traits = this._find(html, `> .stack.traits`)

    super.hydrate(traits)

    this.tabs.hydrate(traits)
    // TODO: hydrate panels component
  }

  _hydrate(): void {
    // TODO: wire holder drag down event
    // TODO: do drag down animation
  }
}
