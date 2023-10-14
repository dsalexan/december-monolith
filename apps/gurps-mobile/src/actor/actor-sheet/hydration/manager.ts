import { GurpsMobileActorSheet } from ".."

import { HTMLHydrationManager } from "@december/foundry/hydration"

import Header from "./header"
import StackWrapper from "./stack"
import { MODULE_ID } from "../../../../config"
import Floating from "./floating"

export default class SheetHTMLHydrationManager extends HTMLHydrationManager {
  sheet: GurpsMobileActorSheet

  // components
  header: Header
  stack: StackWrapper
  floating: Floating

  constructor(sheet: GurpsMobileActorSheet) {
    super(`${MODULE_ID}.${sheet.actor.uuid}.${GurpsMobileActorSheet.sheet_name}`)

    this.sheet = sheet

    this.header = new Header(this)
    this.stack = new StackWrapper(this)
    this.floating = new Floating(this)
  }

  activateListeners(html: JQuery<HTMLElement>) {
    // TODO: Should i reset the listeners?

    this.header._attach(html)
    this.stack._attach(html)
    this.floating._attach(html)

    this.header._persist()
    this.stack._persist()
    this.floating._persist()

    this.header._hydrate()
    this.stack._hydrate()
    this.floating._hydrate()

    this.header._recall()
    this.stack._recall()
    this.floating._recall()
  }

  inject() {
    debugger
  }
}
