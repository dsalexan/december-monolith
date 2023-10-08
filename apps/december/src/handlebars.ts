import * as Foundry from "@december/foundry"

export class TemplatePreloader {
  /**
   * Preload a set of templates to compile and cache them for fast access during rendering
   */
  static preloadHandlebarsHelpers() {
    Foundry.Handlebars.TemplatePreloader.preloadHandlebarsHelpers()
  }
}
