import { Components } from "@december/foundry"

export default class HeaderDetails extends Components.Component {
  hydrate(html: JQuery<HTMLElement>): void {
    const details = this._find(html, `> .details`)

    super.hydrate(details)
  }
}
