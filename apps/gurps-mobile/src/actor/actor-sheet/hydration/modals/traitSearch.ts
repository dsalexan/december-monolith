import { SheetHTMLHydrationManager } from "../hydrator"
import Stack from "../stack"
import Modal from "./modal"

export default class TraitSearchModal extends Modal {
  constructor(manager: SheetHTMLHydrationManager) {
    super(manager, {
      name: `trait.search`,
      storageKey: `trait.search`,
    })
  }

  _attach(html: JQuery<HTMLElement>) {
    const modal = this._find(html, `> .modal.trait-search`)

    return super._attach(modal)
  }
}
