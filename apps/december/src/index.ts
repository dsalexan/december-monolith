import { get as lodashGet } from "lodash"

import { Module, Actor } from "@december/foundry"
import { isNilOrEmpty } from "@december/utils"

import logger, { paint } from "./logger"
import { MODULE_ID } from "../config"
import { TemplatePreloader } from "./handlebars"
import { Toolbox } from "./toolbox"

export default class December extends Module {
  HOST_MODULE_ID: string

  toolbox: Toolbox | null

  constructor(hostModuleID: string, toolbox: boolean) {
    super()

    // FIXME: December should, at least in theory, works as a standalone module
    //        Of course it is not, would be too much trouble to make it so.
    if (hostModuleID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)
    this.HOST_MODULE_ID = hostModuleID

    this.toolbox = toolbox ? new Toolbox(this) : null
  }

  get hasToolbox() {
    return !!this.toolbox
  }

  override listen() {
    super.listen()

    Hooks.on(`init`, this.onInit.bind(this))
    Hooks.on(`ready`, this.onReady.bind(this))

    if (this.hasToolbox) {
      this.toolbox!.on(`open-actor`, () => {
        // FIXME: Doesnt need to be a GURPS specific function, should be a generic
        if (GURPS.LastAccessedActor?.id) this.openActor(GURPS.LastAccessedActor.id)
      })
    }
  }

  // #region DOM

  onLoad() {
    if (this.hasToolbox) this.toolbox!.onLoad()

    this.listen()

    window.get = lodashGet
  }

  // #endregion

  // #region FOUNDRY

  onInit() {
    logger.add(`Initializing module `, paint.bold(MODULE_ID), ` ...`).info()

    // Assign custom classes and constants here

    // Register custom module settings

    // Preload Handlebars templates
    TemplatePreloader.preloadHandlebarsHelpers()

    if (this.hasToolbox) this.toolbox!.onInit()
  }

  onReady() {
    if (this.hasToolbox) this.toolbox!.onReady()
  }
  // #endregion

  // #region API

  openTab(name: string) {
    const node = $(`#sidebar a.item[data-tab=${name}]`)[0]
    if (node) node.click()
    else throw new Error(`Tab named "${name}" doesn't exists`)
  }

  openActor(actor: string, key = `id`) {
    const actorId = Actor.getActor(actor, key)

    if (actorId !== undefined) {
      const node = $(`#actors .directory-item.actor[data-document-id=${actorId}] .document-name`)[0]
      if (node) {
        node.click()
        return
      }
    }

    throw new Error(`Actor with ${key} = "${actor}" doesn't exist`)
  }

  clickHeaderWindow(button: string, selector = ``) {
    const node = $(`${selector}.window-app header a.${button}`)[0]
    if (node) node.click()
    else {
      throw new Error(`Window (.window-app) ${isNilOrEmpty(selector) ? `` : `"${selector}"`}doesn't exist`)
    }
  }

  closeWindow(selector = ``) {
    this.clickHeaderWindow(`close`, selector)
  }

  // #endregion
}
