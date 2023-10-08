import logger from "../logger"

import Icons from "../../icons"
import { Maneuver } from "."
import { MOVE_DISPLAY } from "../move"
import { PNG } from "../../icons/maneuvers"

function keys<T extends string | number | symbol>(obj: Record<T, unknown>): T[] {
  return Object.keys(obj) as T[]
}

/**
 * Inject custom maneuvers into original cnormand's gurps
 */
function injectManeuvers(moduleID: string) {
  const maneuvers = GURPS.Maneuvers.getAll()

  /**
   * gurps uses a string value (what I call MOVE_DISPLAY) to reference a "move speed" for maneuvers
   */

  const allout_concentration = GURPS.Maneuvers.createManeuver({
    name: `allout_concentrate` as Maneuver,
    move: MOVE_DISPLAY[`move_half`],
    icon: `no-icon-originally.png`,
    label: `All-out Concentrate`, // TODO: Inject label GURPS.maneuverAllOutConcentrate
  })

  const aod_mental = GURPS.Maneuvers.createManeuver({
    name: `aod_mental` as Maneuver,
    move: MOVE_DISPLAY[`move_half`],
    icon: `no-icon-originally.png`,
    label: `All-out Defense (Mental)`, // TODO: Inject label GURPS.maneuverAllOutDefenseMental
  })

  maneuvers[`allout_concentrate`] = allout_concentration
  maneuvers[`aod_mental`] = aod_mental
}

/**
 * Update icon references in original cnormand's gurps
 */
function updateIcons(moduleID: string) {
  const filepath = `modules/${moduleID}/icons/maneuvers/`

  const maneuvers = GURPS.Maneuvers.getAll()

  for (const name of keys(maneuvers) as Maneuver[]) {
    const maneuver = maneuvers[name]
    const _icons = Icons[name]

    const iconArray = Array.isArray(_icons) ? _icons : [_icons]

    let iconName = PNG[name]

    if (iconName === undefined) {
      debugger
      logger.add(`No icon name provided for "${name}" override, skipping...`).warn()
    } else {
      maneuver._data.icon = `${filepath}${iconName}.png`
      // maneuver._data.icons = iconArray.map((_, index) => `${filepath}${iconName}${index === 0 ? `` : `-` + index.toString()}.png`)
    }
  }
}

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
function hijackManeuvers() {}

/**
 *
 */
export default function (moduleID: string) {
  logger.add(`Extending maneuvers...`).verbose()

  injectManeuvers(moduleID)
  updateIcons(moduleID)

  // hijack "Maneuvers" class exported from actor/maneuvers.js in gurps
  // token.js
  // Hooks.on(`hooks:before:createToken`, function (...args) {
  //   console.log(`a hook for create token is to be registered`, Hooks._hooks.createToken, `x`, ...args)
  // })

  // Hooks.on(`hooks:on:createToken`, function (hook, fn) {
  //   if (fn.includes(`async _createToken(`) && fn.includes(`/** @type {GurpsActor} */ (token.actor)`)) {
  //     const index = Hooks._hooks.createToken.indexOf(fn => fn === fn)
  //     const method = Hooks._hooks.createToken[index]

  //     console.log(`a hook for create token was registered`, Hooks._hooks.createToken, `x`, fn, `@`, fn)
  //   }
  // })

  // const GurpsToken = CONFIG.Token.objectClass
  // const original_drawEffects = GurpsToken.drawEffects

  // GurpsToken.drawEffects = (...args) => original_drawEffects.call({ Maneuvers: `kkkk` }, ...args)

  // const hooks = Hooks._hooks.createToken
  // for (let f of Hooks._hooks.createToken.filter(f => f.toString().includes(`createEmbeddedDocuments("Drawing"`))) Hooks.off(`preUpdateToken`, f)
}
