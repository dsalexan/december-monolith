import { TabsHydrator, TabsHydratorProperties } from "@december/foundry/hydration"
import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

export type StackHydratorProperties = {
  hideOnCollapse: boolean
  defaultCollapsed: boolean
  name: string
  storageKey: string
}

export default class Stack extends SheetHydrator<StackHydratorProperties> {
  get STORAGE() {
    return {
      EXPANDED: `${this.properties.storageKey}.expanded`,
    }
  }

  tabs: TabsHydrator
  // @ts-ignore
  declare properties: StackHydratorProperties

  constructor(manager: SheetHTMLHydrationManager, properties: StackHydratorProperties & TabsHydratorProperties) {
    super(manager, properties)

    this.tabs = new TabsHydrator(manager, properties)

    this._add(this.tabs)
  }

  _attach(html: JQuery<HTMLElement>) {
    this.tabs._attach(html)

    return super._attach(html)
  }

  _persist(): this {
    this.on(`expand`, ({ data }) => this.manager.storage.set(this.STORAGE.EXPANDED, data))

    return super._persist()
  }

  _hydrate() {
    // TODO: wire holder drag down event
    // TODO: do drag down animation

    const holder = this.html.find(` > .holder`)

    // wire events
    holder.on(`click`, () => this.expand())

    return super._hydrate()
  }

  _recall(): this {
    // collapsed
    const isExpanded = this.manager.storage.get<boolean>(this.STORAGE.EXPANDED, !this.properties.defaultCollapsed)
    this.expand(isExpanded)

    return super._recall()
  }

  // API
  expand(state?: boolean) {
    const isCollapsed = this.html.hasClass(`collapsed`)
    const isHidden = this.html.hasClass(`hidden`)
    const isExpanded = !isCollapsed && !isHidden

    const _state = state === undefined ? !isExpanded : state

    // there is no "expanded" class for stack
    if (_state) {
      this.html.removeClass(`hidden`)
      this.html.removeClass(`collapsed`)
    } else {
      if (this.properties.hideOnCollapse) this.html.addClass(`hidden`)
      else this.html.addClass(`collapsed`)
    }

    this.fire(`expand`, _state)
  }

  hide(state?: boolean) {
    const isHidden = this.html.hasClass(`hidden`)
    const _state = state === undefined ? !isHidden : state

    this.html.toggleClass(`hidden`, !_state)

    this.fire(`hide`, _state)
  }
}
