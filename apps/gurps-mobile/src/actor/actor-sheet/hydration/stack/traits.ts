import { SheetHTMLHydrationManager } from "../hydrator"
import Stack from "./stack"

export default class StackTraits extends Stack {
  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {
      hideOnCollapse: true,
      defaultCollapsed: false,
      name: `traits`,
      storageKey: `traits`,
      defaultTab: `attributes`,
    })
  }

  _attach(html: JQuery<HTMLElement>) {
    const traits = this._find(html, `> .stack.traits`)

    return super._attach(traits)
  }
}
