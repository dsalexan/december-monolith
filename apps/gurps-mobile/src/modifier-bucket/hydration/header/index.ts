import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"
import SendModifiers from "./send"

export default class Header extends SheetHydrator {
  send: SendModifiers

  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})

    this.send = new SendModifiers(manager)

    this._add(this.send)
  }

  _attach(html: JQuery<HTMLElement>) {
    const header = this._find(html, `> .header`)

    this.send._attach(html)

    return super._attach(header)
  }

  _hydrate(): this {
    const self = this

    const close = this.html.find(` > .button.close`)
    const send = this.html.find(` > .button.send`)

    // wire events
    close.on(`click`, () => this.close())
    send.on(`click`, () => this.openSend())

    return super._hydrate()
  }

  // API
  close() {
    this.bucket.close()

    this.fire(`close`)
  }

  openSend(state?: boolean) {
    const parent = this.html.parent()

    const isShowingSend = parent.hasClass(`show-send`)
    const _state = state === undefined ? !isShowingSend : state

    parent.toggleClass(`show-send`, _state)

    this.fire(`openSend`, _state)
  }
}
