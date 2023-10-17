import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"

export default class Header extends SheetHydrator {
  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const header = this._find(html, `> .header`)

    return super._attach(header)
  }

  _hydrate(): this {
    const self = this

    const close = this.html.find(` > .button.close`)

    // wire events
    close.on(`click`, () => this.close())

    return super._hydrate()
  }

  // API
  close() {
    this.bucket.close()

    this.fire(`close`)
  }
}
