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
    if (range.isPoint()) return [(range.x - 1) * 2 + 1, range.x * 2]

    const before_imaginary = (range.x - 1) * 2 + 1
    const before = range.x * 2

    const after = range.y * 2 + 1
    const after_imaginary = (range.y + 1) * 2

    const previous_imaginary = this.imaginary[range.x]
    const next_imaginary = this.imaginary[range.y + 1]

    let _before = before
    if (previous_imaginary === 0 && this.spacing[before_imaginary] > this.spacing[_before]) _before = before_imaginary

    let _after = after
    if (next_imaginary === 0 && this.spacing[after_imaginary] > this.spacing[_after]) _after = after_imaginary

    return [_before, _after]
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
    for (const _range of ranges) {
      if (!_range.isInterval()) {
        widths.push([this.imaginary[_range.x]])
        continue
      }

      let fullWidth = sum(range(_range.x, _range.y + 1).map(c => this.columns[c]))
      let innerSpacing = 0
      let innerImaginary = 0

      for (let c = _range.x + 1; c <= _range.y; c++) {
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

        const ranges = sequence.range.split()
        const columns = sum(ranges.flatMap(r => (r.isPoint() ? this.imaginary[r.x] || 1 : range(r.x, r.y + 1).map(c => this.columns[c])))) // full width availble (number of columns available, both discreet and imaginary)

        const diff = length - columns // SEQUENCE_CONTENT - COLUMNS

        // measure full size and check if it is bigger than range
        if (diff > 0) {
          const average = Math.floor(length / (columns || 1))
          const averages = ranges.flatMap(r => (r.isPoint() ? [r.x] : range(r.x, r.y + 1))).map(() => average)
          if (sum(averages) < length) averages[0] += length - sum(averages)

          // if it is, stretch all columns inside full range by average
          for (const range of ranges) {
            for (let i = range.x; i <= range.y; i++) {
              const isImaginary = range.isPoint()

              const target = !isImaginary ? this.columns[i] : this.imaginary[i]

              const newSize = Math.max(target, averages.shift()!)

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
        const first = ranges[0]
        const last = ranges[ranges.length - 1]

        const before = first.isInterval() ? first.x * 2 : (first.x - 1) * 2 + 1
        const after = last.isInterval() ? last.y * 2 + 1 : last.y * 2

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

  /** Returns an list of sequences with all "gaps" filled */
  fill(row: Row, ranges: Range[]) {
    const FILLING_CHARACTER = `▮` // · ■
    const FILLING_COLOR = paint.grey

    /**
     * The idea is to fill all ranges in range with content
     *    The content can come from row.sequences
     *    Or it can be filled with FILLING_CHARACTER
     */

    const filled: Sequence[] = []

    const queue = [...row.sequences]
    let sequence = queue.shift()

    // for (const [i, range] of ranges.entries()) {
    for (let i = 0; i < ranges.length; i++) {
      // define CURSOR, which list the last range already covered in filled
      const _last = last(filled)?.range
      const __entries = _last?.getEntries() ?? []
      const CURSOR = last(__entries) ?? null

      let range = ranges[i]
      const _entries = range.getEntries()

      // define LIMITS
      //    A: first possible range (last currently in filled, fallback to first of range)
      //    B: last possible range (last of range)

      const B = _entries[_entries.length - 1]
      let A = _entries[0]
      if (CURSOR instanceof Point) A = new Interval(CURSOR.index, CURSOR.index)
      else if (CURSOR instanceof Interval) A = new Point(CURSOR.end + 1)

      // no more sequences to consume
      if (!sequence) {
        const R = Range.fromEntryRange(A, B)
        const R_width = this.width(R)
        if (R_width > 0) filled.push(Sequence.FILL(FILLING_COLOR(FILLING_CHARACTER), R))

        continue
      }

      const beforeGap = new Range(A).compare(sequence.range)

      // fill space between RANGE and SEQUENCE
      if (beforeGap & RANGE_COMPARISON.STARTS_BEFORE) {
        const before = A instanceof Point ? Range.fromPoint(A.index) : Range.fromInterval(A.start, sequence.range.x - 1)
        if (this.width(before) > 0) filled.push(Sequence.FILL(FILLING_COLOR(FILLING_CHARACTER), before))
      }

      const position = range.compare(sequence.range)

      // add sequence to filled (since it starts before range is finished <=> since range ends after sequence starts)
      if (position & (RANGE_COMPARISON.ENDS_AFTER_START | RANGE_COMPARISON.ENDS_SAME)) {
        while (sequence && range.compare(sequence.range) & (RANGE_COMPARISON.ENDS_AFTER_START | RANGE_COMPARISON.ENDS_SAME)) {
          filled.push(sequence) // pass sequence

          // discard ranges that are fully consumed by sequence
          while (i + 1 < ranges.length && ranges[i + 1].compare(sequence.range) & (RANGE_COMPARISON.ENDS_SAME | RANGE_COMPARISON.ENDS_BEFORE)) {
            range = ranges[++i]
          }

          sequence = queue.shift() // get next sequence

          if (sequence) {
            // find new cursor/A
            // if it is not the same as "sequence" start, then dont continue this while (because there is gap missing)
            const _last = last(filled)?.range
            const __entries = _last?.getEntries() ?? []
            const CURSOR = last(__entries) ?? null

            let A = _entries[0]
            if (CURSOR instanceof Point) A = new Interval(CURSOR.index, CURSOR.index)
            else if (CURSOR instanceof Interval) A = new Point(CURSOR.end + 1)

            // if (new Range(A).compare(sequence.range) & RANGE_COMPARISON.STARTS_BEFORE) debugger
            if (new Range(A).compare(sequence.range) & RANGE_COMPARISON.STARTS_BEFORE) {
              i--
              break
            }
          }
        }
      }
    }

    return filled
  }
}
