import { GurpsMobileActorSheet } from ".."

import { HTMLHydrationManager } from "@december/foundry/hydration"

import Header from "./header"
import Stack from "./stack"
import { MODULE_ID } from "../../../../config"

export default class SheetHTMLHydrationManager extends HTMLHydrationManager {
  sheet: GurpsMobileActorSheet

  // components
  header: Header
  stack: Stack

  constructor(sheet: GurpsMobileActorSheet) {
    super(`${MODULE_ID}.${sheet.actor.uuid}.${GurpsMobileActorSheet.sheet_name}`)

    this.sheet = sheet

    this.header = new Header(this)
    this.stack = new Stack(this)
  }

  activateListeners(html: JQuery<HTMLElement>) {
    // TODO: Should i reset the listeners?

    this.hydrate(html)
  }

  hydrate(html: JQuery<HTMLElement>) {
    this.header.hydrate(html)
    this.stack.hydrate(html)
  }
}