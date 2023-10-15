import { isNil } from "lodash"
import SheetHydrator, { SheetHTMLHydrationManager } from "../../hydrator"

export default class Treasure extends SheetHydrator {
  get STORAGE() {
    return {
      OPEN: `traits.equipment.treasure.open`,
      EDIT: `traits.equipment.treasure.edit`,
      SELECTED: `traits.equipment.treasure.selected`,
    }
  }

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const treasure = this._find(html, `> .panels > .panel > .header > .treasure`)

    return super._attach(treasure)
  }

  _persist() {
    this.on(`open`, ({ data }) => this.manager.storage.set(this.STORAGE.OPEN, data))
    this.on(`edit`, ({ data }) => this.manager.storage.set(this.STORAGE.OPEN, data))

    this.on(`select`, ({ data: { coin, state } }) => {
      if (state) this.manager.storage.set(this.STORAGE.SELECTED, coin)
      else this.manager.storage.remove(this.STORAGE.SELECTED)
    })

    return super._persist()
  }

  _hydrate() {
    const self = this

    const chevron = this.html.find(` > .header > .chevron`)

    const coins = this.html.find(` > .coins`)
    const coin = coins.find(` > .coin`)

    const slider = this.html.find(` > .inputs > input[type="range"]`)

    // wire events
    chevron.on(`click`, () => this.open(false))

    coins.on(`click`, () => this.open(true))
    coin.on(`click`, function (event) {
      const isOpen = self.html.hasClass(`open`)
      if (isOpen) self.select($(this).data(`key`))
    })

    slider.on(`input`, function (event) {
      const element = slider[0] as any

      const tempSliderValue = element.value
      // sliderValue.textContent = tempSliderValue

      // TODO: Transform max according to proximity of current value to limit
      // TODO: Update stonks/stinks when value is changed

      const progress = (tempSliderValue / element.max) * 100
      element.style.setProperty(`--percentage`, `${progress}%`)
    })

    return super._hydrate()
  }

  _recall() {
    const isOpen = this.manager.storage.get<boolean>(this.STORAGE.OPEN)
    if (!isNil(isOpen)) this.open(isOpen)

    const isEdit = this.manager.storage.get<boolean>(this.STORAGE.EDIT)
    if (!isNil(isEdit)) this.edit(isEdit)

    const isSelected = this.manager.storage.get<string>(this.STORAGE.SELECTED)
    if (!isNil(isSelected)) this.select(isSelected, true)

    return super._recall()
  }

  // API
  open(state?: boolean) {
    const isOpen = this.html.hasClass(`open`)
    const _state = state === undefined ? !isOpen : state

    this.html.toggleClass(`open`, _state)

    this.fire(`open`, _state)
  }

  edit(state?: boolean) {
    const isEdit = this.html.hasClass(`edit`)
    const _state = state === undefined ? !isEdit : state

    this.html.toggleClass(`edit`, _state)

    this.fire(`edit`, _state)
  }

  select(key: string, state?: boolean) {
    const coin = this.html.find(` > .coins > .coin[data-key="${key}"]`)

    const isSelected = coin.hasClass(`selected`)
    const _state = state === undefined ? !isSelected : state

    this.html.find(` > .coins > .coin.selected`).removeClass(`selected`)
    if (_state) coin.addClass(`selected`)

    this.edit(_state)

    this.fire(`select`, { coin: key, state: _state })
  }
}
