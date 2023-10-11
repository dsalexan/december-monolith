import { Components } from "@december/foundry"
import { isNil } from "lodash"

export type TabsProperties = {
  storageKey: string
}

export default class Tabs extends Components.Component<TabsProperties> {
  hydrate(html: JQuery<HTMLElement>): void {
    const tabs = this._find(html, `> .tabs`)

    super.hydrate(tabs)
  }

  _persist() {
    this.on(`select`, ({ data }) => this.manager.storage.set(`${this.properties.storageKey}.selected-tab`, data))
  }

  _hydrate(): void {
    const self = this
    // TODO: apply selected tab as data-value
    // TODO: update selected tab class
    // TODO: wire tab click event

    const tab = this.html.find(`> .tab`)

    // wire events
    tab.on(`click`, function (event) {
      self.select($(this).data(`value`))
    })

    // set selected tab (forced to render what is missing)
    const selectedTab = this.manager.storage.get<string>(`${this.properties.storageKey}.selected-tab`)
    if (!isNil(selectedTab)) this.select(selectedTab, true)
  }

  select(value: string, force = false) {
    const tabs = this.html
    const currentValue = tabs.data(`value`)

    if (!force && value === currentValue) return

    tabs.data(`value`, value)
    tabs.find(`> .tab.selected`).removeClass(`selected`)
    tabs.find(`> .tab[data-value="${value}"]`).addClass(`selected`)

    // const panels = this.html.find(`> .panels`)

    // panels.find(`> .panel`).removeClass(`selected`)
    // panels.find(`> .panel[data-value="${value}"]`).addClass(`selected`)

    this.fire(`select`, value)
  }
}
