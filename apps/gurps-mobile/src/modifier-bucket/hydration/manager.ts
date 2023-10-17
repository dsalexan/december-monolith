// import { GurpsMobileActorSheet } from ".."

import { HTMLHydrationManager } from "@december/foundry/hydration"
import GurpsMobileModifierBucketEdtior from ".."
import { MODULE_ID } from "../../../config"

import Header from "./header"
import Body from "./body"
import Floating from "./floating"
// import StackWrapper from "./stack"
// import { MODULE_ID } from "../../../../config"
// import Floating from "./floating"
// import TraitCardList from "./trait/list"
// import TraitSearch from "./modals/traitSearch"

export default class ModifierBucketHTMLHydrationManager extends HTMLHydrationManager {
  // sheet: GurpsMobileActorSheet
  bucket: GurpsMobileModifierBucketEdtior

  // // components
  header: Header
  body: Body
  floating: Floating

  // traits: {
  //   list: TraitCardList
  // }

  // modals: {
  //   search: TraitSearch
  // }

  constructor(bucket: GurpsMobileModifierBucketEdtior) {
    super(`${MODULE_ID}.modifier-bucket`)

    this.bucket = bucket

    this.header = new Header(this)
    this.body = new Body(this)
    this.floating = new Floating(this)

    // this.traits = {
    //   list: new TraitCardList(this),
    // }

    // this.modals = {
    //   search: new TraitSearch(this),
    // }
  }

  activateListeners(html: JQuery<HTMLElement>) {
    // TODO: Should i reset the listeners?

    const zeroth = [this.header, this.body, this.floating] // [this.header, this.stack, this.floating, this.modals.search, this.traits.list]
    for (const hydrator of zeroth) hydrator._attach(html)
    for (const hydrator of zeroth) hydrator._persist()
    for (const hydrator of zeroth) hydrator._hydrate()
    for (const hydrator of zeroth) hydrator._recall()
  }
}
