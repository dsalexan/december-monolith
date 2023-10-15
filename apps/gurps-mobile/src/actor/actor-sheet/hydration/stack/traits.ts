import { SheetHTMLHydrationManager } from "../hydrator"
import Stack from "./stack"
import Treasure from "./traits/treasure"

export default class StackTraits extends Stack {
  treasure: Treasure

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {
      hideOnCollapse: true,
      defaultCollapsed: false,
      name: `traits`,
      storageKey: `traits`,
      defaultTab: `attributes`,
    })

    this.treasure = new Treasure(manager)

    this._add(this.treasure)
  }

  _attach(html: JQuery<HTMLElement>) {
    const traits = this._find(html, `> .stack.traits`)

    this.treasure._attach(traits)

    return super._attach(traits)
  }
}
