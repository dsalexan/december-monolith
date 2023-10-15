import { TabsHydrator, TabsHydratorProperties } from "@december/foundry/hydration"
import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

export type ModalHydratorProperties = {
  name: string
  storageKey: string
}

export default class Modal extends SheetHydrator<ModalHydratorProperties> {
  get STORAGE() {
    return {
      // EXPANDED: `${this.properties.storageKey}.expanded`,
    }
  }

  // @ts-ignore
  declare properties: ModalHydratorProperties

  constructor(manager: SheetHTMLHydrationManager, properties: ModalHydratorProperties) {
    super(manager, properties)
  }

  _attach(html: JQuery<HTMLElement>) {
    return super._attach(html)
  }

  _persist(): this {
    // this.on(`expand`, ({ data }) => this.manager.storage.set(this.STORAGE.EXPANDED, data))

    return super._persist()
  }

  _hydrate() {
    const backdrop = this.html.find(` > .backdrop`)

    const close = this.html.find(` > .wrapper > .header > .close`)

    // wire events
    backdrop.on(`click`, () => this.open(false))
    close.on(`click`, () => this.open(false))

    return super._hydrate()
  }

  _recall(): this {
    // collapsed
    // const isExpanded = this.manager.storage.get<boolean>(this.STORAGE.EXPANDED, !this.properties.defaultCollapsed)
    // this.expand(isExpanded)

    return super._recall()
  }

  // API
  open(state?: boolean) {
    const isOpen = this.html.hasClass(`open`)
    const _state = state === undefined ? !isOpen : state

    this.html.toggleClass(`open`, _state)

    this.fire(`open`, _state)
  }
}
