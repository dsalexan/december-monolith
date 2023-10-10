/**
 * Compiles a list of icons TO ALL places (static assets, json list to be consumed in hanbldlebars, etc)
 */

import path from "path"
import fs from "fs"

import Icons from "@december/gurps/../icons"
import { MANEUVERS, Maneuver } from "@december/gurps/maneuvers"
import IconImporter from "@december/foundry/icons"

import { chunk } from "lodash"
import chalk from "chalk"

/**
 * The two (atm) sources of icons (mdi and custom)
 *    If any source is added, some treatment must beimplemented in fetchManeuverIcon (and maybe in other places too)
 */
const MDI = `D:\\Downloads\\MaterialDesign\\svg`
const ASSETS = path.join(__dirname, `../static/icons`)

const iconImporter = new IconImporter()

type ManeuverIconRecipe = { path: string; destination: string }

/**
 * Fetch icon information (@decembe/gurps) for a maneuver
 */
function fetchManeuverIcon(maneuver: Maneuver) {
  const recipes = [] as ManeuverIconRecipe[]

  const icon = Icons[maneuver as string]
  // bail out if maneuver has no icon
  if (!icon) {
    console.warn(`Maneuver "${maneuver}" has no icon`)
    return recipes
  }

  // intermediary treatment for maneuvers with multiple icons
  const icons = Array.isArray(icon) ? icon : [icon]
  for (let i = 0; i < icons.length; i++) {
    let icon = icons[i]

    // decide source directory for icon
    const isMDI = icon.includes(`mdi-`)

    const source = isMDI ? MDI : ASSETS
    icon = isMDI ? icon.replace(`mdi-`, ``) : icon

    // check if it exists
    if (!fs.existsSync(path.join(source, `${icon}.svg`))) {
      console.log(chalk.grey(`  [${maneuver}] Icon "${chalk.white.bold(icon)}" not found in ${chalk.bold(source)}`))
      continue
    }

    // decide destination and source file
    const destination = (i === 0 ? `man-${maneuver}.png` : `man-${maneuver}-${i}.png`).replaceAll(`_`, `-`)
    const filepath = path.join(source, `${icon}.svg`)

    recipes.push({ path: filepath, destination })
  }

  return recipes
}

/**
 * Import all maneuver icons as .png files into assets
 */
async function importManeuversPNGs(force = false, chunkSize = 40) {
  const ASSETS_MANEUVERS = path.join(__dirname, `../static/icons/maneuvers`)

  // get recipes for all maneuvers
  const recipes = MANEUVERS.map(maneuver => fetchManeuverIcon(maneuver)).flat()

  // ignoring already parsed maneuvers
  let allowedRecipes = [...recipes]
  if (!force) {
    allowedRecipes = allowedRecipes.filter(recipe => {
      const alreadyExists = fs.existsSync(path.join(ASSETS_MANEUVERS, recipe.destination))
      return !alreadyExists
    })
  }

  console.log(`[Maneuvers] Rendering ${allowedRecipes.length} svgs`)
  if (recipes.length == 0) return

  // chunk recipes in groups of 40 for "parellel" processing
  const chunks = chunk(allowedRecipes, chunkSize)
  for (let i = 0; i < chunks.length; i++) {
    const recipes = chunks[i]

    const colors = [`#EEEEEE`]
    const sizes = [480]

    // parse pngs
    const pngs = recipes.map(recipe => iconImporter.png(recipe.path, path.join(ASSETS_MANEUVERS, recipe.destination), { colors, sizes })).flat()

    // await chunk completion
    await Promise.all(pngs)

    console.log(`    ${i * chunkSize}...${Math.min((i + 1) * chunkSize, recipes.length) - 1}`)
  }
}

// 1) Import all maneuver icons as .png files into assets
importManeuversPNGs(false)

// 2) Build a json with svg definitions of all icons in source
iconImporter.json([ASSETS], path.join(__dirname, `../src/core/icons/custom.json`), true)
