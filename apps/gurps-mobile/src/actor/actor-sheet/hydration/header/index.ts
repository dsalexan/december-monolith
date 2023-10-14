import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

import HeaderDetails from "./details"

export default class Header extends SheetHydrator {
  details: HeaderDetails

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})

    this.details = new HeaderDetails(manager, {})

    this._add(this.details)
  }

  _attach(html: JQuery<HTMLElement>) {
    const header = this._find(html, `> .header`)

    this.details._attach(header)

    return super._attach(header)
  }
}
