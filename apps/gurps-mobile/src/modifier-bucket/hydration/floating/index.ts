import { TabsHydrator } from "@december/foundry/hydration"
import SheetHydrator, { ModifierBucketHTMLHydrationManager } from "../hydrator"
import Character from "./character"
import Summary from "./summary"
import Modifier from "../modifier"

export default class Floating extends SheetHydrator {
  character: Character
  summary: Summary

  constructor(manager: ModifierBucketHTMLHydrationManager) {
    super(manager, {})

    this.character = new Character(manager)
    this.summary = new Summary(manager)

    this._add(this.character, this.summary)
  }

  _attach(html: JQuery<HTMLElement>) {
    const floating = this._find(html, `> .floating`)
    const characters = this._find(floating, `> .characters > .wrapper`)

    this.character._attach(characters)
    this.summary._attach(floating)

    return super._attach(floating)
  }

  _hydrate(): this {
    const self = this

    const buttons = this.html.find(` > .buttons`)

    const clear = buttons.find(` > .button.clear`)
    const roll = buttons.find(` > .button.roll`)
    const current = buttons.find(` > .button.current-modifiers`)
    const characterName = buttons.find(` > .button.character-name`)
    const closeChooseCharacter = buttons.find(` > .button.close-choose-character`)

    // wire events
    clear.on(`click`, () => this.clear())
    roll.on(`click`, () => this.roll())
    current.on(`click`, () => this.showCurrentModifiers())
    characterName.on(`click`, () => this.showChooseCharacterBox(true))
    closeChooseCharacter.on(`click`, () => this.showChooseCharacterBox(false))

    return super._hydrate()
  }

  // API
  clear() {
    // TODO: Implement clear modifiers
    alert(`Clear current modifiers!`)
  }

  roll() {
    // TODO: Implement roll modal open stuff
    alert(`Open roll modal`)
  }

  showCurrentModifiers(state?: boolean) {
    const isShowingSummary = this.html.hasClass(`show-summary`)
    const _state = state === undefined ? !isShowingSummary : state

    this.html.toggleClass(`show-summary`, _state)

    this.fire(`showSummary`, _state)
  }

  showChooseCharacterBox(state?: boolean) {
    const isShowingCharacters = this.html.hasClass(`show-characters`)
    const _state = state === undefined ? !isShowingCharacters : state

    this.html.toggleClass(`show-characters`, _state)

    this.fire(`showChooseCharacterBox`, _state)
  }
}
