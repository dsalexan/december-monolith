import { AutocompleteHydrator } from "@december/foundry/hydration"
import { SheetHTMLHydrationManager } from "../hydrator"
import Stack from "../stack"
import Modal from "./modal"

export default class TraitSearchModal extends Modal {
  autocomplete: AutocompleteHydrator

  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {
      name: `trait.search`,
      storageKey: `trait.search`,
    })

    this.autocomplete = new AutocompleteHydrator(manager, {
      storageKey: `trait.search.autocomplete`,
    })

    this._add(this.autocomplete)
  }

  _attach(html: JQuery<HTMLElement>) {
    const modal = this._find(html, `> .modal.trait-search`)
    const wrapper = this._find(modal, `> .wrapper`)
    const content = this._find(wrapper, ` > .content`)

    this.autocomplete._attach(content)

    return super._attach(modal)
  }

  _hydrate(): this {
    return super._hydrate()
  }
}
