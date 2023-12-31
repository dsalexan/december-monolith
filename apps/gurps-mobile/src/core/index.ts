import { Module } from "@december/foundry"
import logger, { paint } from "../logger"
import { TemplatePreloader } from "./handlebars"
import { MODULE_ID } from "../../config"
import ManeuverHUDButton from "../actor/maneuver-button"
import GurpsMobileActor from "../actor/actor"
import { GurpsMobileActorSheet } from "../actor/actor-sheet"
import GurpsMobileModifierBucketEdtior from "../modifier-bucket"

/**
 * This is the core of the module. A static class responsible for registering events and shit
 */
export default class GurpsMobileCore extends Module {
  ModifierBucketEditor!: GurpsMobileModifierBucketEdtior

  constructor() {
    super()
  }

  override listen() {
    super.listen()

    Hooks.on(`init`, this.onInit.bind(this))
    Hooks.on(`renderTokenHUD`, this.onRenderTokenHUD.bind(this))
  }

  onLoad() {
    this.listen()

    // window.FeatureFactory = new FeatureFactory()
    // window.GCA = new GCAManager()
    // GurpsMobileToken.onLoad()
  }

  onInit() {
    logger.add(`Initializing core `, paint.bold(MODULE_ID), ` ...`).info()

    // Assign custom classes and constants here
    // Modifier Bucket must be defined after hit locations
    this.ModifierBucketEditor = new GurpsMobileModifierBucketEdtior()
    this.ModifierBucketEditor.render(true)

    // Register custom module settings

    // Preload Handlebars templates
    TemplatePreloader.preloadHandlebarsHelpers()
    TemplatePreloader.preloadHandlebarsTemplates()

    // Define custom Entity classes
    // @ts-ignore
    CONFIG.Actor.documentClass = GurpsMobileActor

    // Register Sheet Classes
    Actors.registerSheet(`gurps`, GurpsMobileActorSheet as any, {
      // Add this sheet last
      label: `Mobile`,
      makeDefault: false,
    })
  }

  // eslint-disable-next-line no-undef
  onRenderTokenHUD(hud: TokenHUD<ApplicationOptions>, html: JQuery<HTMLElement>, token: Token) {
    ManeuverHUDButton.replaceOriginalGURPSHUD(hud, html, token)
  }
  // #endregion

  // #region 3RD PARTY
  // #endregion

  // #region METHODS
  // #endregion

  // #region DOM

  // #endregion
}
