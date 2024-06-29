import { isArray, range } from "lodash"

import type { NodePrinterOptions } from "."
import type NodePrinter from ".."
import type { CalculationHeader } from "./header"

const EMPTY = ``
const WHITESPACE = ` `

export interface PaddingColumn {
  BEFORE: string
  AFTER: string
}

class PaddingColumnManager {
  size: number
  columns: PaddingColumn[] = []

  constructor(n: number) {
    this.size = n
    this.reset()
  }

  reset() {
    for (let i = 0; i < this.size; i++) this.columns.push({ BEFORE: EMPTY, AFTER: EMPTY })
  }

  c(index: number) {
    return this.columns[index]
  }

  before(index: number) {
    if (this.columns[index] === undefined) debugger

    this.columns[index].BEFORE = WHITESPACE
    // if there is a column before, add a whitespace to it too
    if (index > 1) this.columns[index - 1].AFTER = WHITESPACE
  }

  after(index: number) {
    if (this.columns[index] === undefined) debugger

    this.columns[index].AFTER = WHITESPACE
    // if there is a column after, add a whitespace to it too
    if (index < this.size - 1) this.columns[index - 1].BEFORE = WHITESPACE
  }

  both(index: number) {
    this.before(index)
    this.after(index)
  }
}

export function calculatePadding(printer: NodePrinter, options: Partial<NodePrinterOptions>, _: CalculationHeader) {
  const padding = new PaddingColumnManager(_.SOURCE_TEXT.length)

  // determine level range to calculate paddings
  let CALCULATE_PADDING_AT_LEVELS = options.calculate?.levels ?? _.PRINT_LEVELS
  if (options.calculate?.upTo !== undefined) CALCULATE_PADDING_AT_LEVELS = range(0, options.calculate?.upTo + 1)
  if (options.calculate?.from !== undefined) CALCULATE_PADDING_AT_LEVELS = range(options.calculate?.from, _.ROOT_MAX_LEVEL)

  for (let level = 0; level < _.ROOT_MAX_LEVEL; level++) {
    if (!CALCULATE_PADDING_AT_LEVELS.includes(level)) continue

    const nodes = _.ROOT_LEVELS[level]
    for (const node of nodes) {
      if (node.syntax.name === `nil`) {
        padding.after(node.start)
      } else {
        // pad relevant fractions of node content ("generic" way)
        for (let i = 0; i < node.relevant.length; i++) {
          if (node.relevant[i] === undefined) debugger

          if (isArray(node.relevant[i])) {
            const _range = node.relevant[i] as [number, number]

            padding.before(_range[0])
            padding.after(_range[1])
          } else {
            padding.both(node.relevant[i] as number)
          }
        }
      }
    }
  }

  return padding.columns
}
