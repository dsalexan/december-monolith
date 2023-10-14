import { isNil } from "lodash"

import Hydrator from "../hydrator"

export type TabsHydratorProperties = {
  storageKey: string
  defaultTab: string
}

export default class TabsHydrator extends Hydrator<TabsHydratorProperties> {
  tabs!: JQuery<HTMLElement>
  panels!: JQuery<HTMLElement>

  private get __selected_tab() {
    return `${this.properties.storageKey}.selected-tab`
  }

  _attach(html: JQuery<HTMLElement>) {
    this.tabs = this._find(html, `> .tabs`)
    this.panels = this._find(html, `> .panels`)

    return super._attach(html)
  }

  _persist() {
    this.on(`select`, ({ data }) => this.manager.storage.set(this.__selected_tab, data))

    return super._persist()
  }

  _hydrate() {
    const self = this

    const tab = this.tabs.find(`> .tab`)
    const panel = this.panels.find(`> .panel`)

    // wire events
    tab.on(`click`, function (event) {
      self.select($(this).data(`value`))
    })

    return super._hydrate()
  }

  _recall() {
    // set selected tab (forced to render what is missing)
    const selectedTab = this.manager.storage.get<string>(this.__selected_tab, this.properties.defaultTab)
    if (!isNil(selectedTab)) this.select(selectedTab, true)

    return super._recall()
  }

  // API
  select(value: string, force = false) {
    const currentValue = this.tabs.data(`value`)

    if (!force && value === currentValue) return

    this.tabs.data(`value`, value)
    this.tabs.find(`> .tab.selected`).removeClass(`selected`)
    this.tabs.find(`> .tab[data-value="${value}"]`).addClass(`selected`)

    this.panels.find(`> .panel.selected`).removeClass(`selected`)
    this.panels.find(`> .panel[data-value="${value}"]`).addClass(`selected`)

    this.fire(`select`, value)
  }
}
