// import styles
import "./styles/index.scss"

import { MODULE_ID } from "../config"

import { get } from "lodash"

console.log(`get dsalexan`, get({ a: { b: true } }, `a.b`))

import logger from "./logger"

import December from "@december/december"
import Mobile from "@december/mobile"
import GURPS4eGameAid from "@december/gurps"

import { Types } from "@december/foundry"

import GurpsMobileCore from "./core"

/**
 * THIS IS THE ROOT INDEX FILE FOR EVERYTHING THE MODULE SHOULD HAVE
 */

// inject header stuff
document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="http://cdn.jsdelivr.net/npm/@mdi/font@6.9.96/css/materialdesignicons.min.css">`)[0])
document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="https://rsms.me/inter/inter.css">`)[0])
document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:200,300,400,500,600,700&display=swap"/>`)[0])
document.querySelector(`head`)?.appendChild($(`<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">`)[0])

document
  .querySelector(`head`)
  ?.appendChild(
    $(
      `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.css" integrity="sha384-YiVwk+MBV52+yIvvplLwDxm3iGDI7dYb731lqsN9ASGBpIpJ/dte35lBIuR5oGFU" crossorigin="anonymous">`,
    )[0],
  )

// inject globals
const DECEMBER = (window.DECEMBER = new December(MODULE_ID, true))
const MOBILE = (window.MOBILE = new Mobile(MODULE_ID))
const GURPS_EXTENSION = (window.GURPS.EXTENSION = new GURPS4eGameAid(MODULE_ID))
const GURPS_MOBILE = (window.GURPS_MOBILE = new GurpsMobileCore())

// DOM Events (usually onLoad)
DECEMBER.onLoad()
MOBILE.onLoad()
GURPS_EXTENSION.onLoad()
GURPS_MOBILE.onLoad()

/**
 * HERE SHOULD ONLY BE EVENTS THAT ARE INTEGRATING ALL THE MODULES TOGETHER
 */

// #region FOUNDRY EVENTS
Hooks.once(`init`, () => {
  // Initializing modules
  logger.add(`Module integration initialized`).info()
})

// #endregion

// #region 3rd-party Events

//    #region GURPS Events
Hooks.on(`gurps:set-last-accessed-actor`, (actor: Types.StoredDocument<Actor> | null, tokenDocument: unknown) => {
  if (!DECEMBER.toolbox) return
  if (!DECEMBER.toolbox.DOM) throw new Error(`Tried to manipulated toolbox DOM before it was initialized`)

  if (!GURPS.LastAccessedActor) DECEMBER.toolbox.DOM.openActor.addClass(`disabled`)
  else {
    DECEMBER.toolbox.DOM.openActor.removeClass(`disabled`)
    DECEMBER.toolbox.DOM.openActor.find(`.label.name`).text(GURPS.LastAccessedActor.name ? GURPS.LastAccessedActor.name : `Open Actor`)
  }
})
//    #endregion

// #endregion
