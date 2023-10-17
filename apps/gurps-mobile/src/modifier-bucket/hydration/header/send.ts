import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"
import Player from "./player"

export default class SendModifiers extends SheetHydrator {
  player: Player

  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})

    this.player = new Player(manager)

    this._add(this.player)
  }

  _attach(html: JQuery<HTMLElement>) {
    const characters = this._find(html, `> .characters`)
    const wrapper = this._find(characters, `> .wrapper`)

    this.player._attach(wrapper)

    return super._attach(characters)
  }

  _hydrate(): this {
    const self = this

    const buttons = this.html.find(` > .buttons`)

    const send = buttons.find(` > .button.send`)

    // wire events
    send.on(`click`, () => this.send())

    return super._hydrate()
  }

  // API
  send() {
    // TODO: Implement send modifiers to target PLAYERA
    alert(`Sending modifiers to PLAYER`)
    // this.bucket.close()
    // this.fire(`send`, { target })
  }

  enable(state?: boolean) {
    const button = this.html.find(` > .buttons > .button.send`)

    const isDisabled = button.hasClass(`disabled`)
    const _state = state === undefined ? !isDisabled : state

    button.toggleClass(`disabled`, !_state)

    this.fire(`enable`, _state)
  }
}
