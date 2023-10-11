import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

import StackTraits from "./traits"

export default class Stack extends SheetHydrator {
  traits: StackTraits

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})

    this.traits = new StackTraits(manager)
  }

  hydrate(html: JQuery<HTMLElement>): void {
    const stackWrapper = this._find(html, `> .stack-wrapper`)

    super.hydrate(stackWrapper)

    this.traits.hydrate(stackWrapper)
  }
}
