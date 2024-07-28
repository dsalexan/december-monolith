import { difference } from "lodash"
export default class Range {
  start: number
  length: number

  get isRange() {
    return this.length > 0
  }

  get end() {
    if (this.length === 0) throw new Error(`Range has no length`)

    return this.start + this.length - 1
  }

  constructor(start: number, length: number) {
    this.start = start
    this.length = length
  }

  static interval(start: number, end: number) {
    return new Range(start, end - start + 1)
  }

  static merge(...ranges: Range[]) {
    if (ranges.length === 0) return new Range(0, 0)

    const start = Math.min(...ranges.map(range => range.start))
    const end = Math.max(...ranges.map(range => range.end))

    return Range.interval(start, end)
  }

  /** Returns all ranges not contained in list of ranges */
  static difference(...ranges: Range[]) {
    if (ranges.length === 0) return []

    const differences: Range[] = []

    for (const [i, range] of [...ranges.entries()].slice(1)) {
      const previous = ranges[i - 1]

      if (previous.end + 1 < range.start) differences.push(Range.interval(previous.end + 1, range.start - 1))
    }

    return differences
  }

  /** Check if range overlaps with another range */
  overlap(range: Range) {
    // foir sizeless ranges, just check if start is inside the range
    if (!this.isRange) return this.start <= range.start || this.start >= range.end

    return Math.max(this.start, range.start) - Math.min(this.end, range.end) <= 0
  }
}
