import { Module } from "@december/foundry"

import loggerFactory from "../logger"
import December from ".."

const logger = loggerFactory.child(`toolbox`)

export class Toolbox extends Module {
  december: December
  DOM?: {
    toolbox: JQuery<HTMLElement>
    openActor: JQuery<HTMLElement>
  }

  constructor(december: December) {
    super()

    this.december = december
  }

  override listen() {
    this.listen()
  }

  // #region DOM

  onLoad() {
    // Inject HTML
    this.build()

    // DOM events
    document.addEventListener(`fullscreenchange`, () => setTimeout(this.onResize.bind(this), 100))
    window.addEventListener(`resize`, this.onResize.bind(this))
    window.addEventListener(`scroll`, this.onResize.bind(this))

    this.onResize()
  }

  onResize() {
    // pass
  }

  // #endregion

  // #region FOUNDRY

  // FOUNDRY EVENTS
  onInit() {
    logger.add(`Initializing module...`).info()
  }

  onReady() {
    // pass
  }

  // #endregion

  // #region METHODS

  private build() {
    const toolbox = $(`<div id="december-toolbox" class="toolbox"></div>`)

    const openActor = $(`<a class="button-wrapper open-actor disabled">
      <div class="label name">
        Open Actor
      </div>
      <div class="label disabled">
        —
      </div>
      <div class="button">
        <i class="icon fas fa-user"></i>
      </div>
    </a>`)
      .appendTo(toolbox)
      .on(`click`, () => {
        this.fire(`open-actor`)
      })

    toolbox.appendTo(`body`)

    this.DOM = {
      toolbox,
      openActor,
    }
  }

  // #endregion

  // #region API

  toggle(state: boolean | undefined = undefined) {
    if (!this.DOM?.toolbox) return

    if (state === undefined) state = !this.DOM.toolbox.is(`:visible`)

    if (state) this.DOM.toolbox.show()
    else this.DOM.toolbox.hide()
  }

  // #endregion
}
