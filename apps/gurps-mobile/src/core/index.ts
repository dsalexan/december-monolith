import logger from "../logger"
import { TemplatePreloader } from "./handlebars"

/**
 * This is the core of the module. A static class responsible for registering events and shit
 */
export default class GurpsMobileCore {
  // #region DOM

  static onLoad() {
    // window.FeatureFactory = new FeatureFactory()
    // window.GCA = new GCAManager()
    // GurpsMobileToken.onLoad()
  }

  // #endregion

  // #region FOUNDRY
  static onInit() {
    logger.add(`Initializing core...`).info()

    // Assign custom classes and constants here

    // Register custom module settings

    // Preload Handlebars templates
    TemplatePreloader.preloadHandlebarsHelpers()

    // Define custom Entity classes
    // @ts-ignore
    // CONFIG.Actor.documentClass = GurpsMobileActor

    // Register Sheet Classes
    // @ts-ignore
    // Actors.registerSheet(`gurps`, GurpsMobileActorSheet, {
    //   // Add this sheet last
    //   label: `Mobile`,
    //   makeDefault: false,
    // })
  }

  // eslint-disable-next-line no-undef
  static onRenderTokenHUD(hud: TokenHUD<ApplicationOptions>, html: JQuery<HTMLElement>, token: Token) {
    // ManeuverHUDButton.replaceOriginalGURPSHUD(hud, html, token)
  }
  // #endregion

  // #region 3RD PARTY
  // #endregion

  // #region METHODS
  // #endregion
}
