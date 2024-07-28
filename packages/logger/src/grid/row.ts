import assert from "assert"
import { Sequence } from "./sequence"
import paint from "../paint"
import { isNil } from "lodash"

import { Range } from "@december/utils"

export default class Row {
  sequences: Sequence[] = [] // already sorted

  constructor() {}

  /** Determine index to insert range (if there is no overlap) */
  _sortedInsert(range: Range): number {
    // IMPLEMENT INSERT WHEN THERE IS SOME SEQUENCE WITHOUT LENGTH (like when the sequence is "" empty string, its range whould be [start, -1])

    // 1. Find earliest sequence that ends before range
    //      -1 means that all sequences end after range.start
    const previous = this.sequences.findLastIndex(sequence => sequence.range.end <= range.start)

    // 2. check if range overlaps with previous
    const _previous = this.sequences[previous]?.range
    if (_previous?.overlap(range)) return -1

    // 3. check if range overlaps with next
    const _next = this.sequences[previous + 1]?.range
    if (_next?.overlap(range)) return -1

    const index = previous + 1

    return index
  }

  /** Sorted insert of sequence in array based on effective range */
  _add(sequence: Sequence) {
    const index = this._sortedInsert(sequence.range)

    assert(index !== -1, `Sequence overlaps with existing sequence`)

    this.sequences.splice(index, 0, sequence)
  }

  add(...sequences: Sequence[]) {
    for (const sequence of sequences) this._add(sequence)

    return this
  }

  /** Returns an list of sequences with all "gaps" filled */
  fill(maxLength?: number) {
    const FILLING_CHARACTER = ` `
    const FILLING_COLOR = paint.grey

    const filled: Sequence[] = []

    let cursor = 0

    for (const [i, sequence] of this.sequences.entries()) {
      // if (sequence.__debug?.name === `n3.b`) debugger

      // there is a gap between cursor and start of current sequence
      if (cursor < sequence.start) {
        filled.push(Sequence.FILL(FILLING_COLOR(FILLING_CHARACTER), new Range(cursor, sequence.start - cursor)))
        cursor += sequence.start - cursor
      }

      filled.push(sequence)

      // ERROR: TEST THIS
      if (!sequence.range.isRange) debugger

      cursor += sequence.range.length
    }

    if (!isNil(maxLength)) if (cursor < maxLength - 1) filled.push(Sequence.FILL(FILLING_COLOR(FILLING_CHARACTER), new Range(cursor, maxLength - cursor - 1)))

    return filled
  }
}
