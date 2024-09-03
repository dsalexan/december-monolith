import { PartialDeep } from "type-fest"
import { isString, sum } from "lodash"

import { Range } from "@december/utils"
import { Grid } from "@december/logger"

import churchill, { Block, paint, Paint } from "../../logger"
import { baseAlphabet } from "../../utils"

import { Node } from "../node/base"

import { TokenFormatOptions } from "./formats/base"
import { PartialObjectDeep } from "type-fest/source/partial-deep"

import { PrintOptions } from "./options"
import { PrintSetup, setup as _setup } from "./setup"
import { center } from "./utils"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { PrintOptions } from "./options"

export default function print(root: Node, options: PrintOptions) {
  const setup = _setup(root, options)
  const { logger, style } = setup

  // TODO: Print original expression reconstructed from AT

  // TODO: Implement nested column numbers by order of magnitude
  // TODO: Implement printing sub-tree
  // TODO: Implement printing column slices

  // 0. Instantiating Grid
  const grid = new Grid.Grid()
  grid.setColumns(setup.tree.expression.length)

  // 1. prepare rows
  prepare(grid, setup)

  // if (global.__DEBUG_LABEL === `then->=1.0*`) debugger // COMMENT

  // 2. Balance grid
  grid.balance()
  grid.prefix += setup.padding.prefix

  // 3. Print debug
  debug(grid, setup)

  // 4. Print rows
  _print(grid, setup)
}

/** Prepare specs into rows to be printed (using pre-defined formats in setup) */
function prepare(grid: Grid.Grid, setup: PrintSetup) {
  for (const [i, spec] of setup.rows.entries()) {
    if (isString(spec)) continue

    // generic, a row can be body (name, content) or header
    //    a spec can yield multiple rows

    // for each format in spec, add a new row to grid
    for (const [k, format] of spec.formats.entries()) {
      const row = new Grid.Row()

      // add prefix
      if (k === 0 && !!spec.prefix?.length) row.addPrefix(...spec.prefix)

      if (global.__DEBUG_LABEL === `-->×1.a` && k === 2) debugger

      // format to sequences
      const sequences = format.fn()
      row.add(...sequences)

      grid.add(row)
    }
  }
}

/** Print debug state of grid */
function debug(grid: Grid.Grid, setup: PrintSetup) {
  const { logger } = setup

  if (grid.prefix > 0) logger.add(`.`.repeat(grid.prefix)) // print prefix (padded by grid)

  // sum inner widths
  for (let c = 0; c <= grid.columns.length; c++) {
    const i = c

    const bi = (c - 1) * 2 + 1
    const b = c * 2

    const width = grid.columns[i]
    const imaginary = grid.imaginary[i]

    let before_imaginary = grid.spacing[bi] ?? 0
    let before = grid.spacing[b] ?? 0

    if (imaginary === 0) {
      if (before_imaginary > before) before = 0
      else before_imaginary = 0
    }

    if (before_imaginary > 0) logger.add(...center(paint.yellow(baseAlphabet(bi)), before_imaginary, paint.bgYellow(` `)))
    if (imaginary > 0) logger.add(...center(paint.grey(i), imaginary, paint.bgGray(` `)))
    if (before > 0) logger.add(...center(paint.yellow(baseAlphabet(b)), before, paint.bgYellow(` `)))

    if (width > 0) {
      const colour = c % 2 === 0 ? paint.blue : paint.green
      const colour2 = c % 2 === 0 ? paint.bgBlue : paint.bgGreen

      logger.add(...center(colour(baseAlphabet(c)), width, colour2(` `)))
    }
  }
  logger.info()
  console.log(` `)
}

/** Print rows */
function _print(grid: Grid.Grid, setup: PrintSetup) {
  const { logger, tree } = setup

  const rootSpan = tree.root.range.split()
  for (const [i, spec] of setup.rows.entries()) {
    if (spec === `BREAKLINE`) {
      console.log(` `)
      continue
    }

    // narrow down to rows in spec
    const rows = grid.rows.slice(...spec.rows)

    for (const [j, raw] of rows.entries()) {
      const format = spec.formats[j] // get the specific format that created the row

      // if (global.__DEBUG_LABEL === `,->root`) debugger

      const row = grid.fill(raw.sequences, rootSpan) // fill gaps in row

      // print prefix (padded by grid)
      const prefix = sum(raw.prefix?.map(p => String(p._data).length) ?? [0])
      if (prefix > 0) logger.add(...raw.prefix)
      if (grid.prefix > prefix) logger.add(` `.repeat(grid.prefix - prefix))

      // print each sequence in row
      for (const [k, sequence] of row.entries()) {
        // if (global.__DEBUG_LABEL === `-->×1.a` && sequence.__debug?.node?.name === `root`) debugger
        // if (sequence.__debug?.node?.name === `C1.a` && sequence.__debug?.format === `name`) debugger
        // if (sequence.__debug?.index === 1 && sequence.__debug?.format === `header`) debugger

        const blocks = sequence.print(grid, format.printingOptions)
        logger.add(...blocks)
      }

      logger.info()
    }
  }
}
