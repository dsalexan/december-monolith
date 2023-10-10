import { GurpsActorSheet } from "gurps/module/actor/actor-sheet"
import { GurpsMobileActorSheet } from ".."

export default class HTMLManager {
  sheet: GurpsMobileActorSheet

  constructor(sheet: GurpsMobileActorSheet) {
    this.sheet = sheet
  }

  activateListeners(html: JQuery<HTMLElement>) {}
}
