import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"
import StackCombat from "./combat"

import StackTraits from "./traits"

export default class StackWrapper extends SheetHydrator {
  traits: StackTraits
  combat: StackCombat

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})

    this.traits = new StackTraits(manager)
    this.combat = new StackCombat(manager)

    this._add(this.traits, this.combat)
  }

  _attach(html: JQuery<HTMLElement>) {
    const stackWrapper = this._find(html, `> .stack-wrapper`)

    this.traits._attach(stackWrapper)
    this.combat._attach(stackWrapper)

    return super._attach(stackWrapper)
  }

  _hydrate(): this {
    this.traits.on(`expand`, ({ data }) => {
      if (data) this.combat.expand(false)
      else this.combat.expand(true)

      const features = this.html.parent().find(` > .features`)
      features.toggleClass(`hidden`, data)
    })

    return super._hydrate()
  }
}
