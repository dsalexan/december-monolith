import SheetHydrator, { SheetHTMLHydrationManager } from "../hydrator"

export default class Floating extends SheetHydrator {
  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {})
  }

  _attach(html: JQuery<HTMLElement>) {
    const floating = this._find(html, `> .floating`)

    return super._attach(floating)
  }

  _hydrate() {
    const self = this
    const traits = this.html.find(` > .floater[data-name="traits"]`)

    const bucket = this.html.find(` > .floater[data-name="bucket"]`)

    // wire events
    traits.on(`click`, () => this.manager.stack.traits.expand(true))
    this.manager.stack.traits.on(`expand`, ({ data }) => self.show(`traits`, !data))

    bucket.on(`click`, () => GURPS_MOBILE.ModifierBucketEditor.render(true))

    return super._hydrate()
  }

  // API
  show(name: string, state?: boolean) {
    const isHidden = this.html.hasClass(`hidden`)
    const _state = state === undefined ? !isHidden : state

    const floater = this.html.find(`> .floater[data-name="${name}"]`)
    floater.toggleClass(`hidden`, !_state)

    this.fire(`hide`, { name, state: _state })
  }
}
