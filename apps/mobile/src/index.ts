import "./styles/index.scss"

import logger, { paint } from "./logger"

import { SETTINGS, SETTINGS_DEFINITIONS } from "./settings"
import { MODULE_ID } from "../config"
import { fixHeight } from "./utils"

import { i18n, Module } from "@december/foundry"
import { registerSettings } from "@december/foundry/settings"

export default class Mobile extends Module {
  active = false
  HOST_MODULE_ID: string

  constructor(hostModuleID: string) {
    super()

    // FIXME: Mobile should, at least in theory, works as a standalone module
    //        Of course it is not, would be too much trouble to make it so.
    if (hostModuleID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)
    this.HOST_MODULE_ID = hostModuleID
  }

  override listen() {
    super.listen()

    Hooks.on(`init`, this.onInit.bind(this))
    Hooks.on(`ready`, this.onReady.bind(this))

    Hooks.on(`canvasInit`, this.onCanvasInit.bind(this))
    Hooks.on(`renderSceneNavigation`, this.onRenderSceneNavigation.bind(this))
    Hooks.on(`renderNotifications`, this.onRenderNotifications.bind(this))
    Hooks.on(`queuedNotification`, this.onQueuedNotification.bind(this))
  }

  // #region DOM

  onLoad() {
    this.listen()

    document.addEventListener(`fullscreenchange`, () => setTimeout(this.onResize, 100))
    window.addEventListener(`resize`, this.onResize.bind(this))
    window.addEventListener(`scroll`, this.onResize.bind(this))

    this.onResize()
  }

  onResize() {
    if (!this.isScreenMobile()) return
    if (this.active) fixHeight()
  }

  // #endregion

  // #region FOUNDRY

  onInit() {
    logger.add(`Initializing module `, paint.bold(MODULE_ID), ` ...`).info()

    // Assign custom classes and constants here

    // Register custom module settings
    if (this.HOST_MODULE_ID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)

    registerSettings(this.HOST_MODULE_ID, [SETTINGS_DEFINITIONS.ALLOW_MOBILE_MODE], {
      [SETTINGS.ALLOW_MOBILE_MODE]: this.onSettingChanged,
    })

    // Preload Handlebars templates

    // Define custom Entity classes

    // Register custom sheets (if any)
  }

  onReady() {
    if (!this.isScreenMobile()) return logger.add(paint.bold(`Skipping`), ` Mobile wrapping (screen > mobile)`).info()
    if (!this.isAllowed()) return logger.add(`Mobile wrapping `, paint.bold.hex(`#e00000`)(`not allowed`), ` on settings`).info()

    logger.add(`Mobile `, paint.green.bold(`ready`), `!`).info()
    this.enter()
  }

  onCanvasInit() {
    if (!this.isScreenMobile()) return

    if (this.active) this.enter()
    else this.leave()
  }

  onRenderSceneNavigation() {
    if (this.active) {
      ui.nav?.collapse()
      logger.add(`Mobile collapsing nav`).info()
    }
  }

  onRenderNotifications(app: any) {
    if (!app.queue.__isProxy) {
      app.queue = new Proxy(app.queue, {
        get: function (target, key) {
          if (key === `__isProxy`) return true

          if (key === `push`) {
            return (...arg: unknown[]) => {
              if (Hooks.call(`queuedNotification`, ...arg)) {
                target.push(...arg)
              }
            }
          }
          return target[key]
        },
      })
    }
  }

  onQueuedNotification(notification: any) {
    if (typeof notification.message === `string`) {
      const regex = /\s.+px/g
      const message = notification.message?.replace(regex, ``)

      const lowResolution = i18n(`translations.ERROR.LowResolution`) as string
      const match = lowResolution.replace(regex, ``)

      if (message === match) {
        logger.add(`Mobile suppresing notification `, notification).info()
        return false
      }

      if (message.includes(`Foundry Virtual Tabletop uses modern JavaScript features which are unsupported on Chromium version less than `)) {
        logger.add(`Mobile suppresing notification `, notification).info()
        return false
      }
    }
  }

  onSettingChanged(active: boolean) {
    if (active) {
      if (this.active) return
      // if (!this.isScreenMobile()) return ui.notifications?.info(I(`ERROR.TryingToEnableMobileModeOnNonMobile`))
    } else {
      if (!this.active) return
    }

    logger.add(`Mobile status changed`, paint.b(active)).info()

    if (active) this.enter()
    else this.leave()
  }

  // #endregion

  isAllowed() {
    if (this.HOST_MODULE_ID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)
    return game.settings.get(this.HOST_MODULE_ID, SETTINGS.ALLOW_MOBILE_MODE)
  }

  isScreenMobile() {
    const media = window.matchMedia(`only screen and (max-width: 760px)`).matches
    const touch = `ontouchstart` in document.documentElement && navigator.userAgent.match(/Mobi/)
    const agentPlataform = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) || /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform)

    return !!agentPlataform || (!!media && !!touch)
  }

  // #region METHODS

  //    #region GENERAL

  private enter() {
    if (!this.isAllowed()) return

    logger.t.add(`Entering mobile mode...`).verbose().tab(2) // COMMENT

    logger.add(`Flagging Mobile singleton as active`).verbose() // COMMENT
    this.active = true

    logger.add(`Adding "mobile" class to body tag`).verbose() // COMMENT
    document.body.classList.add(`mobile`)

    logger.add(`Collapsing Foundry UI Nav`).verbose() // COMMENT
    ui.nav.collapse()

    logger.add(`Fixing viewport height in document tag`).verbose() // COMMENT
    fixHeight()

    logger.add(`Removing canvas`).verbose() // COMMENT
    this.removeCanvas()
    logger.t.add(!this.canvasExists() ? paint.grey.italic(`Canvas successfully removed`) : paint.bold.red(`Could not remove canvas`)).verbose() // COMMENT

    Hooks.call(`${MODULE_ID}:enter`)

    logger.tab(-2) // COMMENT
  }

  private leave() {
    this.active = false

    document.body.classList.remove(`mobile`)

    if (!this.canvasExists()) window.location.reload()

    Hooks.call(`${MODULE_ID}:leave`)
  }

  //    #endregion

  //    #region CANVAS

  private removeCanvas() {
    const node = document.getElementById(`board`)
    if (node && node.parentNode) node.parentNode.removeChild(node)
  }

  private canvasExists() {
    return !!document.getElementById(`board`)
  }

  //    #endregion

  // #endregion
}
