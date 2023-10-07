// import styles
import "./styles/index.scss"

import { MODULE_ID } from "../config"

import { get } from "lodash"

console.log(`get dsalexan`, get({ a: { b: true } }, `a.b`))

import logger from "./logger"

import Mobile from "@december/mobile"
import GurpsMobileCore from "./core"

/**
 * THIS IS THE ROOT INDEX FILE FOR EVERYTHING THE MODULE SHOULD HAVE
 */

// inject header stuff
// document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="http://cdn.jsdelivr.net/npm/@mdi/font@6.9.96/css/materialdesignicons.min.css">`)[0])
// document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="https://rsms.me/inter/inter.css">`)[0])
// document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:200,300,400,500,600,700&display=swap"/>`)[0])
// document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">`)[0])

// document
//   .querySelector(`head`)
//   ?.appendChild(
//     $(
//       `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.css" integrity="sha384-YiVwk+MBV52+yIvvplLwDxm3iGDI7dYb731lqsN9ASGBpIpJ/dte35lBIuR5oGFU" crossorigin="anonymous">`,
//     )[0],
//   )

// inject globals

// DOM Events
// december.onLoad(MODULE_ID)
Mobile.onLoad(MODULE_ID)
// GurpsExtension.onLoad(MODULE_ID)
GurpsMobileCore.onLoad()

// #region 3rd-party Events
//    #region December Events
//      #region Toolbox
// if (december.hasToolbox) {
//   december.toolbox.on(`open-actor`, () => {
//     if (GURPS.LastAccessedActor?.id) december.openActor(GURPS.LastAccessedActor.id)
//   })
// }

//      #endregion
//    #endregion

//    #region GURPS Events
Hooks.once(`gurpsinit`, () => {
  // GurpsExtension.onGurpsInit()
})

Hooks.on(`gurps:set-last-accessed-actor`, (actor, tokenDocument) => {
  // if (!december.toolbox) return
  // if (!december.toolbox.DOM) throw new Error(`Tried to manipulated toolbox DOM before it was initialized`)
  // if (!GURPS.LastAccessedActor) december.toolbox.DOM.openActor.addClass(`disabled`)
  // else {
  //   december.toolbox.DOM.openActor.removeClass(`disabled`)
  //   december.toolbox.DOM.openActor.find(`.label.name`).text(GURPS.LastAccessedActor.name ? GURPS.LastAccessedActor.name : `Open Actor`)
  // }
})
//    #endregion
// #endregion

// #region FOUNDRY EVENTS
Hooks.once(`init`, () => {
  // Initializing modules
  logger.add(`Initializing module...`).info()

  // december.onInit()
  Mobile.onInit()
  // GurpsExtension.onInit()
  GurpsMobileCore.onInit()
})

Hooks.once(`ready`, () => {
  // december.onReady()
  Mobile.onReady()
  // GurpsExtension.onReady()
})

// Add any additional hooks if necessary
Hooks.once(`canvasInit`, () => {
  Mobile.onCanvasInit()
})

Hooks.once(`renderSceneNavigation`, () => {
  Mobile.onRenderSceneNavigation()
})

// remove LowResolution error notification (i guess)
Hooks.once(`renderNotifications`, (app: any) => {
  Mobile.onRenderNotifications(app)
})

Hooks.on(`queuedNotification`, (notification: any) => {
  const _Mobile = Mobile.onQueuedNotification(notification)
  if (_Mobile !== undefined) return _Mobile
})

Hooks.on(`renderTokenHUD`, (hud: TokenHUD, html: JQuery<HTMLElement>, token: Token) => {
  GurpsMobileCore.onRenderTokenHUD(hud, html, token)
})

// #endregion
