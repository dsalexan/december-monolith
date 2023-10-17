import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../../hydrator"

export default class Summary extends SheetHydrator {
  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const summary = this._find(html, `> .summary`)

    return super._attach(summary)
  }

  _hydrate(): this {
    const self = this

    const header = this.html.find(` > .header`)

    const down = header.find(` > .down`)

    // wire events
    down.on(`click`, () => this.manager.floating.showCurrentModifiers(false))

    return super._hydrate()
  }

  // API
}
