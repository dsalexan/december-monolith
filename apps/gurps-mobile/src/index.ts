// import styles
import "./styles/index.scss"

import { MODULE_ID } from "../config"

import logger from "./logger"

// // inject header stuff

// // inject globals

// // dom events

// // 3rd party events

// #region FOUNDRY EVENTS
Hooks.once(`init`, () => {
  // Initializing modules
  logger.add(`Initializing module...`).info()

  // december.onInit()
  // Mobile.onInit()
  // GurpsExtension.onInit()
  // GurpsMobile.onInit()
})

// #endregion
