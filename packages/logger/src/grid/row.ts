import assert from "assert"
import { Sequence } from "./sequence"
import paint from "../paint"
import { isNil } from "lodash"

import { Range } from "@december/utils"
import Block from "../builder/block"

export default class Row {
  sequences: Sequence[] = [] // already sorted
  prefix: Block[] = []

  constructor() {}

  /** Determine index to insert range (if there is no overlap) */
  _sortedInsert(range: Range): number {
    const OFFSET = -0.5
    // IMPLEMENT INSERT WHEN THERE IS SOME SEQUENCE WITHOUT LENGTH (like when the sequence is "" empty string, its range whould be [start, -1])

    // 1. Find latest sequence that ends before range
    //      -1 means that all sequences end after range.start
    const previous = this.sequences.findLastIndex(sequence => sequence.range.offsetPoints(OFFSET).y <= range.offsetPoints(OFFSET).x)

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
    const index = Range.sortedInsert(this.sequences, sequence.range, sequence => sequence?.range)

    assert(index !== -1, `Sequence overlaps with existing sequence`)

    this.sequences.splice(index, 0, sequence)
  }

  add(...sequences: Sequence[]) {
    for (const [k, sequence] of sequences.entries()) {
      // if (global.__DEBUG_LABEL === `]->L5.b` && k === 5) debugger

      this._add(sequence)
    }

    return this
  }

  addPrefix(...blocks: Block[]) {
    this.prefix.push(...blocks)

    return this
  }
}
