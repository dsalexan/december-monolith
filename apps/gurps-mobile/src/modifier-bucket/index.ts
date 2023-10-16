import { MODULE_ID } from "../../config"

export default class GurpsMobileModifierBucketEdtior extends GURPS.ModifierBucketEditorClass {
  constructor(options = {}) {
    super({}, options)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: `GurpsMobileModifierBucketEditor`,
      template: `modules/${MODULE_ID}/templates/modifier-bucket/app.hbs`,
      // minimizable: false,
      // width: 820,
      // scale: scale,
      classes: [`modifier-bucket`, `mobile`],
    })
  }
}
