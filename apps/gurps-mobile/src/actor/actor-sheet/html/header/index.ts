import HTMLManager from ".."
import { Components } from "@december/foundry"
import HeaderDetails from "./details"

export default class Header extends Components.Component {
  details: HeaderDetails

  constructor(manager: HTMLManager) {
    super(manager, {})

    this.details = new HeaderDetails(manager, {})
  }

  hydrate(html: JQuery<HTMLElement>): void {
    const header = this._find(html, `> .header`)

    super.hydrate(header)

    this.details.hydrate(header)
  }
}
