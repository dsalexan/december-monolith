import { MODULE_ID } from "../../config"
import { ModifierBucketHTMLHydrationManager } from "./hydration"

import loggerFactory, { MARKER_BLACK, MARKER_GREEN, MARKER_YELLOW, paint } from "../logger"

const logger_ = loggerFactory.child(`modifier-bucket`, `silly`)
export default class GurpsMobileModifierBucketEdtior extends Application {
  hydration: ModifierBucketHTMLHydrationManager

  constructor(options = {}) {
    super(options)

    this.hydration = new ModifierBucketHTMLHydrationManager(this)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: `GurpsMobileModifierBucketEditor`,
      template: `modules/${MODULE_ID}/templates/modifier-bucket/app.hbs`,
      minimizable: true,
      resizable: true,
      classes: [`modifier-bucket`, `mobile`],
    })
  }

  activateListeners(inner: JQuery<HTMLElement>) {
    // called inside _render, using innerHtml as argument
    //    const data = await this.getData(this.options);
    //    inner = await this._renderInner(data);

    logger_.add(`activateListeners`).t.add(inner).info()

    this.hydration.activateListeners(inner)
  }
}
