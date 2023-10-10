/**
 * Core framework to compile a list of icons TO ALL places (static assets, json list to be consumed in hanbldlebars, etc) a module would need
 */

import Promise from "bluebird"
import sharp from "sharp"
import xmldom from "xmldom"
import fs from "fs"
import path from "path"

import { parse } from "svg-parser"
import { isNil } from "lodash"
import { readDirectory, svgDefinition, svgToPng } from "./utils"

/**
 * const MDI = "D:\\Downloads\\MaterialDesign\\svg"
 * const ASSETS = path.join(__dirname, `./static/icons`)
 * const iconImporter = new IconImporter(ASSETS)
 *
 *    A) Build a json with svg definitions of all icons in source
 *    C?) Fill static icons with all custom ones ("non mdi")
 *    B) Parse svg to png and save somewhere
 */

export default class IconImporter {
  /**
   * Mount all svg files in sources into a JSON with its definitions
   */
  json(sources: string[], destination: string, onlyCustom = true) {
    if (!onlyCustom) throw new Error(`Non custom static import not implemented`)

    // if source is a directory, get all svgs inside it
    // if source is a file AND a svg, get it

    // aggregate all svgs from sources
    const files = sources.map(source => readDirectory(source, false)).flat()

    // transform files into a svg definition
    const filesAndSVGs = files.map(file => ({ file, svg: svgDefinition(file) })).filter(({ svg }) => !isNil(svg))

    // index definitions into a map
    const svgs = Object.fromEntries(filesAndSVGs.map(({ file, svg }) => [file.name.replace(/.svg$/i, ``), svg]))

    // parse svg definition index into a json file (and save it)
    const json = JSON.stringify(svgs, null, 2)
    fs.writeFileSync(destination, json)
  }

  /**
   * Parse all svgs in sources to pngs into a destination directory
   */
  png(source: string, destination: string, { colors, sizes }: { colors: string[]; sizes: number[] } = { colors: [`#000000`], sizes: [64] }) {
    // determine all specs based on arguments
    const specs = colors.map(color => sizes.map(size => ({ color, size }))).flat()

    // if source is a directory, get all svgs inside it
    // if source is a file AND a svg, get it

    // aggregate all svgs from sources
    const files = readDirectory(source, false)

    // parsing list
    const parsing = files.map(file => specs.map(spec => ({ file, spec }))).flat()

    // async parse each individual file following the specs
    return parsing.map(({ file, spec }) => svgToPng(destination, file, { ...spec, specNameFile: parsing.length > 1 }))
  }
}
