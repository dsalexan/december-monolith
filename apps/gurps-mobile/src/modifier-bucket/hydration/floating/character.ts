import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"

export default class Character extends SheetHydrator {
  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const character = this._find(html, `> .character`)

    return super._attach(character)
  }

  _persist(): this {
    // this.on(`select`, ({ data: { element, state } }) => {
    //   const isSomePlayerSelected = this.html.hasClass(`selected`)
    //   this.manager.header.send.enable(isSomePlayerSelected)
    // })

    return super._persist()
  }

  _hydrate(): this {
    const self = this

    // wire events
    this.html.on(`click`, event => this.select(event.currentTarget))

    return super._hydrate()
  }

  // API
  select(element: HTMLElement, state?: boolean) {
    const character = $(element)

    const isSelected = character.hasClass(`selected`)
    const _state = state === undefined ? !isSelected : state

    character.toggleClass(`selected`, _state)

    this.fire(`select`, { element, state: _state })
  }
}
