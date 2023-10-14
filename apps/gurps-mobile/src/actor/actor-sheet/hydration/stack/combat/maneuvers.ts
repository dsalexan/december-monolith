import { isNil } from "lodash"
import SheetHydrator, { SheetHTMLHydrationManager } from "../../hydrator"

export default class Maneuvers extends SheetHydrator {
  get STORAGE() {
    return {
      SELECTED: `combat.maneuvers.selected`,
    }
  }

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const tray = this._find(html, `> .maneuvers`)

    return super._attach(tray)
  }

  _persist() {
    this.on(`select`, ({ data: { value, state } }) => {
      if (state) this.manager.storage.set(this.STORAGE.SELECTED, value)
      else this.manager.storage.remove(this.STORAGE.SELECTED)
    })

    return super._persist()
  }

  _hydrate() {
    const self = this

    const maneuver = this.html.find(` > .row > .maneuver`)

    // wire events
    maneuver.on(`click`, function (event) {
      self.select($(this).data(`value`))
    })

    return super._hydrate()
  }

  _recall() {
    // set expanded
    const isSelected = this.manager.storage.get<string>(this.STORAGE.SELECTED)
    if (!isNil(isSelected)) this.select(isSelected, true)
    else {
      this.html.find(` > .row:not(:first-child)`).addClass(`hidden`)
    }

    return super._recall()
  }

  // API
  select(value: string, state?: boolean) {
    const maneuver = this.html.find(` > .row > .maneuver[data-value="${value}"]`)

    const isSelected = maneuver.hasClass(`selected`)
    const _state = state === undefined ? !isSelected : state

    this.html.find(` > .row:not(:first-child)`).addClass(`hidden`)
    this.html.find(` > .row > .maneuver.selected`).removeClass(`selected`)
    if (_state) {
      maneuver.addClass(`selected`)
      // show up to next row
      const index = maneuver.parent().index() + 1
      for (let i = 2; i <= index + 1; i++) this.html.find(` > .row:nth-child(${i})`).removeClass(`hidden`)
    }

    this.fire(`select`, { value, state: _state })
  }
}
