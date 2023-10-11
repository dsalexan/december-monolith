import HTMLManager from ".."
import StackTraits from "./traits"
import { Components } from "@december/foundry"

export default class Stack extends Components.Component {
  traits: StackTraits

  constructor(manager: HTMLManager) {
    super(manager, {})

    this.traits = new StackTraits(manager)
  }

  hydrate(html: JQuery<HTMLElement>): void {
    const stackWrapper = this._find(html, `> .stack-wrapper`)

    super.hydrate(stackWrapper)

    this.traits.hydrate(stackWrapper)
  }
}
