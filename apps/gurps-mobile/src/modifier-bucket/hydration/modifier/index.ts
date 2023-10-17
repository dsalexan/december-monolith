import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"

export default class Modifier extends SheetHydrator {
  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const player = this._find(html, `> .modifier`)

    return super._attach(player)
  }

  _persist(): this {
    // this.on(`select`, ({ data: { element, state } }) => {
    //   const isSomePlayerSelected = this.html.hasClass(`selected`)
    //   this.manager.header.send.enable(isSomePlayerSelected)
    // })

    return super._persist()
  }

  _hydrateElement(element: HTMLElement, index: number): this {
    const self = this

    // sync color (shouldnt be necessary, but...)
    const value = parseInt($(element).data(`value`))
    if (!isNaN(value)) {
      $(element).removeClass(value >= 0 ? `red` : `green`)
      $(element).addClass(value >= 0 ? `green` : `red`)
    }

    // wire events
    $(element).on(`click`, event => this.select(event.currentTarget))

    return super._hydrateElement(element, index)
  }

  // API
  select(element: HTMLElement, state?: boolean) {
    const modifier = $(element)

    const isSelected = modifier.hasClass(`selected`)
    const _state = state === undefined ? !isSelected : state

    modifier.toggleClass(`selected`, _state)

    this.fire(`select`, { element, state: _state })
  }
}
