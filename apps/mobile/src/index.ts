import "./styles/index.scss"

import logger, { paint } from "./logger"

import { SETTINGS, SETTINGS_DEFINITIONS } from "./settings"
import { MODULE_ID } from "../config"
import { fixHeight } from "./utils"

import { I, i18n } from "@december/foundry"
import { getSetting, registerSettings } from "@december/foundry/settings"

export default class Mobile {
  static active = false
  static HOST_MODULE_ID: string

  static isAllowed() {
    if (Mobile.HOST_MODULE_ID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)
    return game.settings.get(Mobile.HOST_MODULE_ID, SETTINGS.ALLOW_MOBILE_MODE)
  }

  static isScreenMobile() {
    const media = window.matchMedia(`only screen and (max-width: 760px)`).matches
    const touch = `ontouchstart` in document.documentElement && navigator.userAgent.match(/Mobi/)
    const agentPlataform = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) || /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform)

    return !!agentPlataform || (!!media && !!touch)
  }

  // #region DOM

  static onLoad(hostModuleID: string) {
    // FIXME: Mobile should, at least in theory, works as a standalone module
    //        Of course it is not, would be too much trouble to make it so.
    if (hostModuleID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)
    Mobile.HOST_MODULE_ID = hostModuleID

    // document.addEventListener(`fullscreenchange`, () => setTimeout(Mobile.onResize, 100))
    // window.addEventListener(`resize`, Mobile.onResize)
    // window.addEventListener(`scroll`, Mobile.onResize)

    // this.onResize()
  }

  static onResize(this: void) {
    if (!Mobile.isScreenMobile()) return
    if (Mobile.active) fixHeight()
  }

  // #endregion

  // #region METHODS

  //    #region GENERAL

  static registerSettings() {
    if (Mobile.HOST_MODULE_ID === undefined) throw new Error(`[${MODULE_ID}] Mobile needs a host module to attach settings (HOST_MODULE_ID is empty)`)

    registerSettings(Mobile.HOST_MODULE_ID, [SETTINGS_DEFINITIONS.ALLOW_MOBILE_MODE], {
      [SETTINGS.ALLOW_MOBILE_MODE]: Mobile.onSettingChanged,
    })
  }

  static enter() {
    if (!Mobile.isAllowed()) return

    logger.t.add(`Entering mobile mode...`).verbose().tab(2) // COMMENT

    logger.add(`Flagging Mobile singleton as active`).verbose() // COMMENT
    Mobile.active = true

    logger.add(`Adding "mobile" class to body tag`).verbose() // COMMENT
    document.body.classList.add(`mobile`)

    logger.add(`Collapsing Foundry UI Nav`).verbose() // COMMENT
    ui.nav.collapse()

    logger.add(`Fixing viewport height in document tag`).verbose() // COMMENT
    fixHeight()

    logger.add(`Removing canvas`).verbose() // COMMENT
    Mobile.removeCanvas()
    logger.t.add(!Mobile.canvasExists() ? paint.grey.italic(`Canvas successfully removed`) : paint.bold.red(`Could not remove canvas`)).verbose() // COMMENT

    Hooks.call(`mobile-wrapper:enter`)

    logger.tab(-2) // COMMENT
  }

  static leave() {
    Mobile.active = false

    document.body.classList.remove(`mobile`)

    if (!Mobile.canvasExists()) window.location.reload()

    Hooks.call(`mobile-wrapper:leave`)
  }

  //    #endregion

  //    #region CANVAS

  static removeCanvas() {
    const node = document.getElementById(`board`)
    if (node && node.parentNode) node.parentNode.removeChild(node)
  }

  static canvasExists() {
    return !!document.getElementById(`board`)
  }

  //    #endregion

  // #endregion

  // #region FOUNDRY

  static onInit() {
    logger.add(`Initializing module...`).info()

    // Assign custom classes and constants here

    // Register custom module settings
    Mobile.registerSettings()

    // Preload Handlebars templates

    // Define custom Entity classes

    // Register custom sheets (if any)
  }

  static onReady() {
    if (!Mobile.isScreenMobile()) return logger.add(paint.bold(`Skipping`), `Mobile wrapping (screen > mobile)`).info()
    if (!Mobile.isAllowed()) return logger.add(`Mobile wrapping `, paint.bold.hex(`#e00000`)(`not allowed`), ` on settings`).info()

    logger.add(`Mobile `, paint.green.bold(`ready`), `!`).info()
    Mobile.enter()
  }

  static onCanvasInit() {
    if (!Mobile.isScreenMobile()) return

    if (Mobile.active) Mobile.enter()
    else Mobile.leave()
  }

  static onRenderSceneNavigation() {
    if (Mobile.active) {
      ui.nav?.collapse()
      logger.add(`Mobile collapsing nav`).info()
    }
  }

  static onRenderNotifications(app: any) {
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

  static onQueuedNotification(notification: any) {
    if (typeof notification.message === `string`) {
      const regex = /\s.+px/g
      const message = notification.message?.replace(regex, ``)

      const lowResolution = i18n(`translations.ERROR.LowResolution`) as string
      const match = lowResolution.replace(regex, ``)

      if (message === match) {
        logger.add(`Mobile suppresing notification`, notification).info()
        return false
      }
    }
  }

  static onSettingChanged(this: void, active: boolean) {
    if (active) {
      if (Mobile.active) return
      // if (!Mobile.isScreenMobile()) return ui.notifications?.info(I(`ERROR.TryingToEnableMobileModeOnNonMobile`))
    } else {
      if (!Mobile.active) return
    }

    logger.add(`Mobile status changed`, paint.b(active)).info()

    if (active) Mobile.enter()
    else Mobile.leave()
  }

  // #endregion
}
