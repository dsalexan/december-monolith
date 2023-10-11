import HTMLManager from ".."
import { Component, Tabs } from "@december/foundry/components"

export default class StackTraits extends Component {
  tabs: Tabs

  constructor(manager: HTMLManager) {
    super(manager, {})

    this.tabs = new Tabs(manager, {
      storageKey: `traits`,
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
