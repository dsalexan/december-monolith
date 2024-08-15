import { Range } from "@december/utils"
import { Grid } from "@december/logger"
import churchill, { Block, paint, Paint } from "../logger"

import { PartialDeep } from "type-fest"

import type SyntaxTree from "./tree"
import type Node from "./node"
import { content, RowSpec, header, name } from "./formats"
import { isString, last, sum } from "lodash"
import { TokenFormatOptions } from "./formats/base"
import { PartialObjectDeep } from "type-fest/source/partial-deep"
import { baseAlphabet, numberToLetters } from "../utils"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export default class TreePrinter {
  constructor() {}

  static print(tree: SyntaxTree, from: Node, options: PrintOptions) {
    return new TreePrinter().print(tree, from, options)
  }

  _setup(tree: SyntaxTree, from: Node, options: PrintOptions): PrintSetup {
    const nodesByLevel = tree.nodesByLevel()

    const style: PrintSetup[`style`] = {
      alternateColors: options?.style?.alternateColors ?? true,
      ignoreSpacing: options?.style?.ignoreSpacing ?? false,
    }

    const rows: RowSpec[] = []
    let formatIndex = 0

    // 0. Headers
    rows.push({
      formats: [
        header(tree, true, { index: 0, ignoreSpacing: style.ignoreSpacing }, { ...options.sequence, showBrackets: false }), //
        header(tree, false, { index: 1, ignoreSpacing: style.ignoreSpacing }, { ...options.sequence, showBrackets: false }),
      ],
      rows: [formatIndex, (formatIndex += 2)],
    })

    rows.push(`BREAKLINE`)

    // 1. Determine WHAT to print each level
    for (let level = from.level; level < tree.height; level++) {
      const spec: RowSpec = { formats: [], rows: [-1, -1], prefix: [paint.grey.italic(`${level}`)] }

      spec.formats.push(
        content(
          tree,
          level,
          { index: 0, ignoreSpacing: style.ignoreSpacing, alternateColors: style.alternateColors }, //
          {
            ...options.sequence,
            //
            showBrackets: false,
          },
        ),
      )

      spec.formats.push(
        name(
          tree,
          level,
          { index: 1, ignoreSpacing: style.ignoreSpacing, alternateColors: style.alternateColors, underlineFn: options.style?.underlineFn },
          {
            ...options.sequence,
            //
            showBrackets: true,
          },
        ),
      )

      if (spec.formats.length > 0) {
        spec.rows[0] = formatIndex
        spec.rows[1] = formatIndex += spec.formats.length

        rows.push(spec)
      }
    }

    return {
      logger: options.logger ?? _logger,
      //
      tree: {
        expression: tree.expression,
        nodes: nodesByLevel,
        height: tree.height,
      },
      rows,
      //
      padding: {
        prefix: 2,
      },
      sequence: options.sequence,
      style,
    }
  }

  print(tree: SyntaxTree, from: Node, options: PrintOptions) {
    const { logger, style, ...setup } = this._setup(tree, from, options)

    // TODO: Print original expression reconstructed from AT

    // TODO: Implement nested column numbers by order of magnitude
    // TODO: Implement printing sub-tree
    // TODO: Implement printing column slices

    // 0. Instantiating Grid
    const grid = new Grid.Grid()
    grid.setColumns(setup.tree.expression.length)

    // 1. Prepare rows
    for (const [i, spec] of setup.rows.entries()) {
      if (isString(spec)) continue

      // generic, a row can be body (name, content) or header
      //    a spec can yield multiple rows

      // for each format in spec, add a new row to grid
      for (const [k, format] of spec.formats.entries()) {
        const row = new Grid.Row()

        // add prefix
        if (k === 0 && !!spec.prefix?.length) row.addPrefix(...spec.prefix)

        // format to sequences
        const sequences = format.fn()
        row.add(...sequences)

        grid.add(row)
      }
    }

    // 2. Balance grid
    grid.balance()
    grid.prefix += setup.padding.prefix

    // 3. Print debug
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

    // if (global.__DEBUG_LABEL === `1->L2.b`) debugger
    // debugger

    // 4. Print rows
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
          // if (global.__DEBUG_LABEL === `,->root` && sequence.__debug?.node?.name === `root`) debugger
          // if (sequence.__debug?.node?.name === `C1.a` && sequence.__debug?.format === `name`) debugger
          // if (sequence.__debug?.index === 1 && sequence.__debug?.format === `header`) debugger

          const blocks = sequence.print(grid, format.printingOptions)
          logger.add(...blocks)
        }

        logger.info()
      }
    }

    return this
  }
}

export interface RequiredPrintOptions {
  logger?: typeof _logger
}

export interface PartialPrintOptions {
  sequence: Grid.Sequence.PrintOptions
  style: {
    alternateColors: boolean
    underlineFn: TokenFormatOptions[`underlineFn`]
    ignoreSpacing: boolean
  }
}

export type PrintOptions = RequiredPrintOptions & PartialDeep<PartialPrintOptions>

//

export interface PrintSetup {
  logger: typeof _logger
  //
  tree: {
    expression: string
    nodes: Node[][]
    height: number
  }
  rows: RowSpec[]
  //
  padding: {
    prefix: number
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  sequence: PartialObjectDeep<Grid.Sequence.PrintOptions, {}> | undefined // PartialDeep<Grid.Sequence.PrintOptions>
  style: {
    alternateColors: boolean
    ignoreSpacing: boolean
  }
}

function center(block: Block, width: number, padding?: Block) {
  padding ??= paint.red(` `)
  const character = String(padding?._data)[0]

  const blocks: Block[] = [block]

  const length = sum([String(block._data).length])

  const extra = width - length
  const s = Math.ceil(extra / 2)
  const e = extra - s

  if (s > 0) {
    const _clone = padding._clone()
    _clone._data = character.repeat(s)
    blocks.unshift(_clone)
  }
  if (e > 0) {
    const _clone = padding._clone()
    _clone._data = character.repeat(e)
    blocks.push(_clone)
  }

  return blocks
}
