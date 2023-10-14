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
    const panel = this._find(html, `> .stack-wrapper > .stack > .panels > .panel`)
    const list = this._find(panel, `> .card-list, > .card-list .card-list`)

    return super._attach(list)
  }

  _persist() {
    // TODO: PERSIST closed
    // TODO: PERSIST expanded
    // this.on(`select`, ({ data: { value, state } }) => {
    //   if (state) this.manager.storage.set(this.STORAGE.SELECTED, value)
    //   else this.manager.storage.remove(this.STORAGE.SELECTED)
    // })

    return super._persist()
  }

  _hydrateElement(element: HTMLElement, index: number) {
    const self = this
    const list = $(element)

    const header = list.find(` > .header`)

    const label = header.find(` > .label`)
    const buttons = header.find(`> .buttons`)

    const expand = buttons.find(`> .button.expand`)
    const hideAll = buttons.find(`> .button.hide-all`)
    const showAll = buttons.find(`> .button.show-all`)

    // const maneuver = this.html.find(` > .row > .maneuver`)

    // wire events
    label.on(`click`, () => this.close($(element)))
    expand.on(`click`, () => this.expand($(element)))

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
  close(list: JQuery<HTMLElement>, state?: boolean) {
    const isClosed = list.hasClass(`closed`)
    const _state = state === undefined ? !isClosed : state

    list.toggleClass(`closed`, _state)

    this.fire(`close`, { list, state: _state })
  }

  expand(list: JQuery<HTMLElement>, state?: boolean) {
    const isExpanded = list.hasClass(`expanded`)
    const _state = state === undefined ? !isExpanded : state

    list.toggleClass(`expanded`, _state)
    list.find(`> .header > .buttons > .button.expand`).toggleClass(`active alternative`, _state)

    this.fire(`expand`, { list, state: _state })
  }
}
