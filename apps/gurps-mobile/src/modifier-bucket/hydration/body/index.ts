import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"
import Modifier from "../modifier"

export default class Body extends SheetHydrator {
  tabs: TabsHydrator
  modifier: Modifier

  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})

    this.tabs = new TabsHydrator(manager, {
      storageKey: `modifier-bucket`,
      defaultTab: `combat`,
    })

    this.modifier = new Modifier(manager)

    this._add(this.tabs, this.modifier)
  }

  _attach(html: JQuery<HTMLElement>) {
    const body = this._find(html, `> .body`)
    const wrapper = this._find(body, `> .wrapper`)
    const panels = this._find(wrapper, `> .panels > .panel > div`)

    this.tabs._attach(wrapper)
    this.modifier._attach(panels)

    return super._attach(body)
  }

  _hydrate(): this {
    const self = this

    const close = this.html.find(` > .button.close`)

    // wire events
    close.on(`click`, () => this.close())

    return super._hydrate()
  }

  // API
  close() {
    this.bucket.close()

    this.fire(`close`)
  }
}
