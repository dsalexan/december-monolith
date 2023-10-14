import { isNil } from "lodash"
import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

export default class TraitCardList extends SheetHydrator {
  get STORAGE() {
    return {}
  }

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const list = this._find(html, `> .card-list, > .card-list .card-list`)

    return super._attach(list)
  }

  _persist() {
    // this.on(`select`, ({ data: { value, state } }) => {
    //   if (state) this.manager.storage.set(this.STORAGE.SELECTED, value)
    //   else this.manager.storage.remove(this.STORAGE.SELECTED)
    // })

    return super._persist()
  }

  _hydrateElement(element: HTMLElement, index: number) {
    const self = this
    const list = $(element)

    const label = list.find(` > .label`)

    // const maneuver = this.html.find(` > .row > .maneuver`)

    // // wire events
    // maneuver.on(`click`, function (event) {
    //   self.select($(this).data(`value`))
    // })

    return super._hydrateElement(element, index)
  }

  _recall() {
    // set expanded
    // const isSelected = this.manager.storage.get<string>(this.STORAGE.SELECTED)
    // if (!isNil(isSelected)) this.select(isSelected, true)
    // else {
    //   this.html.find(` > .row:not(:first-child)`).addClass(`hidden`)
    // }

    return super._recall()
  }

  // API
  // select(value: string, state?: boolean) {
  //   const maneuver = this.html.find(` > .row > .maneuver[data-value="${value}"]`)

  //   const isSelected = maneuver.hasClass(`selected`)
  //   const _state = state === undefined ? !isSelected : state

  //   this.html.find(` > .row:not(:first-child)`).addClass(`hidden`)
  //   this.html.find(` > .row > .maneuver.selected`).removeClass(`selected`)
  //   if (_state) {
  //     maneuver.addClass(`selected`)
  //     // show up to next row
  //     const index = maneuver.parent().index() + 1
  //     for (let i = 2; i <= index + 1; i++) this.html.find(` > .row:nth-child(${i})`).removeClass(`hidden`)
  //   }

  //   this.fire(`select`, { value, state: _state })
  // }
}
