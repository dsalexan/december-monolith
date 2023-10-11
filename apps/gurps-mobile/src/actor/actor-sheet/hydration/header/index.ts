import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

import HeaderDetails from "./details"

export default class Header extends SheetHydrator {
  details: HeaderDetails

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})

    this.details = new HeaderDetails(manager, {})
  }

  hydrate(html: JQuery<HTMLElement>): void {
    const header = this._find(html, `> .header`)

    super.hydrate(header)

    this.details.hydrate(header)
  }
}
