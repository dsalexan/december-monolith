import { isNil, range, sortedIndex, sortedIndexBy, sum } from "lodash"
import { Sequence } from "./sequence"
import assert from "assert"
import { Range } from "@december/utils"

import Row from "./row"
import paint from "../paint"
import Block from "../builder/block"

export default class Grid {
  rows: Row[] = []
  columns: number[] = []
  spacing: number[] = []

  constructor() {}

  setColumns(size: number) {
    this.columns = Array(size).fill(1)
    this.spacing = Array(size + 1).fill(0)
  }

  _add(row: Row) {
    this.rows.push(row)
  }

  add(...rows: Row[]) {
    for (const row of rows) this._add(row)

    return this
  }

  width(_range: Range) {
    const width = sum(range(_range.start, _range.end + 1).map(i => this.columns[i]))
    const spacing = sum(range(_range.start + 1, _range.end + 1).map(i => this.spacing[i]))

    return width + spacing
  }

  /** Balance grid, stretching all columns to fit content */
  balance() {
    for (const [r, row] of this.rows.entries()) {
      // for each sequence in row
      for (const sequence of row.sequences) {
        const length = sequence.length

        // measure full size and check if it is bigger than range
        const diff = length - sequence.range.length
        if (diff > 0) {
          const average = Math.floor(length / sequence.range.length)
          const columns = range(sequence.range.start, sequence.range.end + 1).map(() => average)
          if (sum(columns) < diff) columns[0] += diff - sum(columns)

          // if it is, stretch all columns within range
          for (let i = sequence.range.start, j = 0; i <= sequence.range.end; i++, j++) {
            const newSize = Math.max(this.columns[i], columns[j])

            assert(newSize > 0, `Column size should be greater than 0`)
            assert(!isNaN(newSize), `Column size should be a number`)

            this.columns[i] = newSize
          }
        }

        // calculate spacing
        const before = sequence.range.start
        const after = sequence.range.end + 1

        // ERROR: Untested
        if (!sequence.range.isRange) debugger

        if (sequence.spacing.includes(`BEFORE`)) this.spacing[before] = Math.max(this.spacing[before], 1)
        if (sequence.spacing.includes(`AFTER`)) this.spacing[after] = Math.max(this.spacing[after], 1)

        // ERROR: Unimplemented
        if (sequence.spacing.includes(`BETWEEN_COLUMNS`)) debugger
      }
    }
  }

  header(columns: string[], dim = false): Block[] {
    const blocks: Block[] = []

    for (let i = 0; i < columns.length; i++) {
      const width = this.columns[i]
      const content = columns[i]

      let color = paint.white
      if (i % 2 === 0) color = paint.blue
      else color = paint.green

      if (dim) color = content.match(/\s+/) ? paint.bgGray : paint.grey

      const extra = width - content.length
      const start = Math.ceil(extra / 2)
      const end = extra - start

      const startSpacing = this.spacing[i]
      let endSpacing = this.spacing[i + 1]

      // actually, only print end spacing if range ends at the last column
      if (i !== columns.length - 1) endSpacing = 0

      const PADDING_CHARACTER = dim ? ` ` : `.`
      const PADDING_COLOR = dim ? paint.grey : color.dim

      const SPACING_CHARACTER = dim ? ` ` : ` `
      const SPACING_COLOR = paint.red

      if (startSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(startSpacing)))
      if (start > 0) blocks.push(PADDING_COLOR(PADDING_CHARACTER.repeat(start)))
      blocks.push(color(content))
      if (end > 0) blocks.push(PADDING_COLOR(PADDING_CHARACTER.repeat(end)))
      if (endSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(endSpacing)))
    }

    return blocks
  }
}
