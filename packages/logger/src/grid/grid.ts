import { isNil, isString, last, range, sortedIndex, sortedIndexBy, sum } from "lodash"
import { Sequence } from "./sequence"
import assert from "assert"
import { Interval, Point, Range, RANGE_COMPARISON } from "@december/utils"

import Row from "./row"
import paint from "../paint"
import Block from "../builder/block"

export default class Grid {
  rows: Row[] = []
  columns: number[] = []
  imaginary: number[] = []
  /**
   * spacing[i * 2] = BEFORE
   * spacing[i * 2 + 1] = AFTER
   */
  spacing: number[] = []
  //
  prefix: number = 0 // padding for all prefixes

  constructor() {}

  setColumns(size: number) {
    this.spacing = Array(size * 2).fill(0)
    this.columns = Array(size).fill(1)
    this.imaginary = Array(size + 1).fill(0)
  }

  _add(row: Row) {
    this.rows.push(row)
  }

  add(...rows: Row[]) {
    for (const row of rows) this._add(row)

    return this
  }

  getSpacingIndexes(range: Range): [number, number] {
    const x = range.column(`first`)
    const y = range.column(`last`)

    let before = x * 2 - 1 // point always use imaginary spacing
    if (!range.columnIsPoint(`first`)) {
      // before spacings
      const imaginary = before
      const real = x * 2

      const imaginaryColumn = this.imaginary[x]
      if (imaginaryColumn > 0) before = real
      // use real spacing if IMAGINARY_COLUMN is empty AND real spacing is bigger (i.e. use max of imaginary or real spacing if there is no imaginary column in between)
      else if (imaginaryColumn === 0 && this.spacing[real] >= (this.spacing[imaginary] ?? 0)) before = real
      else before = before < 0 ? 0 : before
    }

    let after = y * 2 // point always use imaginary spacing
    if (!range.columnIsPoint(`last`)) {
      // after spacings
      const imaginary = after
      const real = y * 2 + 1

      const imaginaryColumn = this.imaginary[y + 1]
      if (imaginaryColumn > 0) after = real
      // use real spacing if IMAGINARY_COLUMN is empty AND real spacing is bigger (i.e. use max of imaginary or real spacing if there is no imaginary column in between)
      else if (imaginaryColumn === 0 && this.spacing[real] >= (this.spacing[imaginary] ?? 0)) after = real
      else after = after > this.columns.length ? this.columns.length : after
    }

    return [before, after]
  }

  calcWidths(c0: number, cN: number) {
    const widths: { width: number; spacing: { before: number; after: number }; imaginary: number }[] = []

    for (let column = c0; column <= cN; column++) {
      const width = this.columns[column] ?? 0
      const imaginary = this.imaginary[column]
      const before = this.spacing[column * 2]
      const after = this.spacing[column * 2 + 1]

      widths[column] = {
        width,
        imaginary,
        spacing: {
          before,
          after,
        },
      }
    }

    return widths
  }

  width(...ranges: Range[]) {
    const widths: number[][] = []

    // sum inner widths
    for (const r of ranges) {
      let fullWidth = 0
      let innerSpacing = 0
      let innerImaginary = 0

      const entries = r.getEntries()
      for (const entry of entries) {
        if (entry instanceof Point) fullWidth += this.imaginary[entry.index]
        else if (entry instanceof Interval) {
          fullWidth += sum(range(entry.start, entry.end + 1).map(c => this.columns[c]))

          for (let c = entry.start + 1; c <= entry.end; c++) {
            const i = c

            const bi = (c - 1) * 2 + 1
            const b = c * 2

            const a = c * 2 + 1
            const ai = (c + 1) * 2

            const imaginary = this.imaginary[i]

            const before = imaginary === 0 ? Math.max(this.spacing[bi] ?? 0, this.spacing[b] ?? 0) : (this.spacing[bi] ?? 0) + (this.spacing[b] ?? 0)

            innerImaginary += imaginary
            innerSpacing += before
          }
        } else throw new Error(`Unimplemented entry type`)
      }

      widths.push([fullWidth, innerImaginary, innerSpacing])
    }

    // sum spacing between ranges
    const spacing: number[] = range(0, ranges.length - 1).map(() => 0)
    for (let i = 0; i < ranges.length - 1; i++) {
      const A = ranges[i]
      const B = ranges[i + 1]

      // get outer spacing between A and B
      const [, afterA] = this.getSpacingIndexes(A)
      const [beforeB] = this.getSpacingIndexes(B)

      const outerSpacing = sum(range(afterA, beforeB + 1).map(i => this.spacing[i]))

      spacing[i] = outerSpacing
    }

    const result = sum(widths.flat()) + sum(spacing)

    assert(!isNaN(result), `Width should be a number`)

    return result
  }

  /** Balance grid, stretching all columns to fit content */
  balance() {
    // stretch columns where needed
    for (const [r, row] of this.rows.entries()) {
      // for each sequence in row
      for (const [i, sequence] of row.sequences.entries()) {
        const length = sequence.length // space ocuppied by sequence content

        // const ranges = sequence.range.split()
        const simplifiedRange = Range.simplify(sequence.range, 0.5)

        if (simplifiedRange.toString() !== sequence.range.toString()) debugger

        // calculate full column space ("full width")
        let columns = 0

        for (const entry of simplifiedRange.getEntries()) {
          if (entry instanceof Point) columns += this.imaginary[entry.index] || 1
          else if (entry instanceof Interval) columns += sum(range(entry.start, entry.end + 1).map(c => this.columns[c]))
          else throw new Error(`Unimplemented entry type`)
        }

        // const columns = sum(ranges.flatMap(r => (r.isPoint() ? this.imaginary[r.x] || 1 : range(r.x, r.y + 1).map(c => this.columns[c])))) // full width availble (number of columns available, both discreet and imaginary)

        const diff = length - columns // SEQUENCE_CONTENT - COLUMNS

        // measure full size and check if it is bigger than range
        if (diff > 0) {
          const average = Math.floor(length / (columns || 1))
          const firstAverage = average * columns < length ? length - average * columns : average

          // if it is, stretch all columns inside full range by average
          for (const entry of simplifiedRange.getEntries()) {
            const isImaginary = entry instanceof Point

            const i0 = isImaginary ? entry.index : entry.start
            const iN = isImaginary ? entry.index : entry.end

            for (let i = i0; i <= iN; i++) {
              const target = !isImaginary ? this.columns[i] : this.imaginary[i]
              const localAverage = i === i0 ? firstAverage : average

              const newSize = Math.max(target, localAverage)

              // no need to stretch
              if (newSize === target) continue

              assert(newSize > 0, `Column size should be greater than 0`)
              assert(!isNaN(newSize), `Column size should be a number`)
              assert(newSize !== Infinity && newSize !== -Infinity, `Column size should be finite`)

              // if (isImaginary) debugger

              if (isImaginary) this.imaginary[i] = newSize
              else this.columns[i] = newSize
            }
          }
        }

        // calculate spacing
        const before = !simplifiedRange.columnIsPoint(`first`) ? simplifiedRange.column(`first`) * 2 : (simplifiedRange.column(`first`) - 1) * 2 + 1
        const after = !simplifiedRange.columnIsPoint(`first`) ? simplifiedRange.column(`last`) * 2 + 1 : simplifiedRange.column(`last`) * 2

        const ignoreBefore = before < 0
        const ignoreAfter = after >= this.spacing.length

        if (sequence.spacing.includes(`BEFORE`) && !ignoreBefore) {
          this.spacing[before] = Math.max(this.spacing[before], 1)
          assert(!isNaN(this.spacing[before]), `Spacing should be a number`)
        }

        if (sequence.spacing.includes(`AFTER`) && !ignoreAfter) {
          this.spacing[after] = Math.max(this.spacing[after], 1)
          assert(!isNaN(this.spacing[after]), `Spacing should be a number`)
        }

        // ERROR: Unimplemented
        if (sequence.spacing.includes(`BETWEEN_COLUMNS`)) debugger
      }
    }

    // remove double spacing if there is no imaginary content
    for (let i = 0; i < this.imaginary.length; i++) {
      // COLUMNS here just for reference, prob never gonna use
      const previous = i - 1
      const next = i

      // spacings
      const before = (i - 1) * 2 + 1 // previous column's after
      const after = i * 2 // next column's before

      // if there is imaginary content, do not remove spacing
      if (this.imaginary[i] > 0) continue

      if (after >= this.spacing.length) continue

      const spacing = Math.max(this.spacing[before] ?? 0, this.spacing[after] ?? 0)

      // here i'm setting the value at after because it is the BEFORE from column's POV
      this.spacing[after] = spacing
      this.spacing[before] = 0

      assert(!isNaN(this.spacing[after]), `Spacing should be a number`)
    }

    // calculate row prefix padding
    for (const row of this.rows) {
      const prefix = sum(row.prefix.map(block => String(block._data).length))

      assert(!isNaN(prefix), `Prefix should be a number`)

      this.prefix = Math.max(this.prefix, prefix)
    }
  }

  header(columns: string[], dim = false): Block[] {
    const blocks: Block[] = []

    for (let i = 0; i < columns.length; i++) {
      const width = this.columns[i]
      const content = columns[i]
      const imaginary = this.imaginary[i]

      let color = paint.white
      if (i % 2 === 0) color = paint.blue
      else color = paint.green

      if (dim) color = content.match(/\s+/) ? paint.bgGray : paint.grey

      const extra = width - content.length
      const start = Math.ceil(extra / 2)
      const end = extra - start

      const startSpacing = this.spacing[i * 2]
      let endSpacing = this.spacing[i * 2 + 1]

      // actually, only print end spacing if range ends at the last column
      if (i !== columns.length - 1) endSpacing = 0

      const PADDING_CHARACTER = dim ? ` ` : `.`
      const PADDING_COLOR = dim ? paint.grey : color.dim

      const SPACING_CHARACTER = dim ? ` ` : ` `
      const SPACING_COLOR = paint.red

      const IMAGINARY_CHARACTER = dim ? ` ` : `.`
      const IMAGINARY_COLOR = paint.grey

      if (imaginary > 0) {
        // ERROR: Untested
        if (i === this.columns.length - 1) debugger

        const imaginaryStartSpacing = this.spacing[(i - 1) * 2 + 1] ?? 0

        if (imaginaryStartSpacing) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(imaginaryStartSpacing)))
        blocks.push(IMAGINARY_COLOR(IMAGINARY_CHARACTER.repeat(imaginary)))
      }

      if (startSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(startSpacing)))
      if (start > 0) blocks.push(PADDING_COLOR(PADDING_CHARACTER.repeat(start)))
      blocks.push(color(content))
      if (end > 0) blocks.push(PADDING_COLOR(PADDING_CHARACTER.repeat(end)))
      if (endSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(endSpacing)))
    }

    return blocks
  }

  /** Returns a list of sequences with all "gaps filled" */
  fill(sequences: Sequence[], space: Range[]) {
    // #region Calculate space coverage (easier to debug like this)

    const OFFSET = -0.5

    type CoverageEntry = { range: Range; sequence?: Sequence }
    const coverage: CoverageEntry[] = []

    // 1. Sorted insert ranges from sequences and space into coverage
    for (const sequence of sequences) {
      const index = Range.sortedInsert(coverage, sequence.range, entry => entry?.range)

      assert(index !== -1, `Sequence overlaps with existing sequence (Should not happen when transfering sequences to coverage)`)

      coverage.splice(index, 0, { range: sequence.range, sequence })
    }

    const _coverage = coverage.map(({ range }) => range.getEntries()).flat()

    // 2. Fill gaps by subtracting sequences from all ranges in space
    //      basically a variant implementation of Range.sortedInsert (but here we clip the range to fit into a non-overlaping gap)
    for (const range of space) {
      // find latest range that ends before range
      const previous = coverage.findLastIndex(({ range: covered }) => covered.offsetPoints(OFFSET).y <= range.offsetPoints(OFFSET).x)

      // CLIP if there is overlap
      let clipped = range.clone().subtract(_coverage)

      // insert clipped range into coverage
      for (const entry of clipped.getEntries()) {
        const _range = new Range(entry)
        if (this.width(_range) > 0) {
          const index = coverage.findLastIndex(({ range: covered }) => covered.offsetPoints(OFFSET).y <= _range.offsetPoints(OFFSET).x)
          coverage.splice(index + 1, 0, { range: _range })
        }
      }
    }

    // 3. Compile coverage into sequences to return
    const filled: Sequence[] = []
    for (let { range, sequence } of coverage) filled.push(sequence ?? Sequence.FILL(paint.grey(` `), range))

    return filled
  }
}
