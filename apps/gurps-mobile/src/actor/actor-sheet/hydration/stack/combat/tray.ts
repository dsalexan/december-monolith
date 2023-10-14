import SheetHydrator, { SheetHTMLHydrationManager } from "../../hydrator"

export default class Tray extends SheetHydrator {
  get STORAGE() {
    return {
      EXPANDED: `combat.tray.expanded`,
    }
  }

  get tray() {
    return this.html
  }

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const tray = this._find(html, `> .tray`)

    return super._attach(tray)
  }

  _persist() {
    this.on(`expand`, ({ data }) => this.manager.storage.set(this.STORAGE.EXPANDED, data))

    return super._persist()
  }

  _hydrate() {
    const self = this

    const down = this.html.find(` > .chevron.down`)
    const up = this.html.find(` > .chevron.up`)

    // wire events
    down.on(`click`, () => self.expand(true))
    up.on(`click`, () => self.expand(false))

    return super._hydrate()
  }

  _recall() {
    // set expanded
    const isExpanded = this.manager.storage.get<boolean>(this.STORAGE.EXPANDED, false)
    this.expand(isExpanded)

    return super._recall()
  }

  // API
  expand(state?: boolean) {
    const isExpanded = this.html.hasClass(`expanded`)
    const _state = state === undefined ? !isExpanded : state

    this.html.toggleClass(`expanded`, _state)

    this.fire(`expand`, _state)
  }
}
