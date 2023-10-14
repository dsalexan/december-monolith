import { SheetHTMLHydrationManager } from "../../hydrator"
import Stack from "../stack"
import Maneuvers from "./maneuvers"
import Tray from "./tray"

export default class StackCombat extends Stack {
  tray: Tray
  maneuvers: Maneuvers

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {
      hideOnCollapse: false,
      defaultCollapsed: true,
      name: `combat`,
      storageKey: `combat`,
      defaultTab: `offensive`,
    })

    this.tray = new Tray(manager)
    this.maneuvers = new Maneuvers(manager)

    this._add(this.tray, this.maneuvers)
  }

  _attach(html: JQuery<HTMLElement>) {
    const combat = this._find(html, `> .stack.combat`)

    this.tray._attach(combat)
    this.maneuvers._attach(combat)

    return super._attach(combat)
  }
}
