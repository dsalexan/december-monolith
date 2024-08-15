import assert from "assert"
import { difference, last, orderBy } from "lodash"

export class Point {
  index: number

  constructor(index: number) {
    this.index = index
  }

  clone() {
    return new Point(this.index)
  }

  /** Checks if two points (or a Point and an interval) overlap */
  overlap(intervalOrPoint: Interval | Point) {
    if (intervalOrPoint instanceof Point) return overlap_Points(this, intervalOrPoint)
    else return overlap_Interval_Point(intervalOrPoint, this)
  }

  toString() {
    return `${this.index}`
  }
}

export class Interval {
  start: number
  end: number

  get length() {
    return this.end - this.start + 1
  }

  constructor(start: number, end: number) {
    this.start = start
    this.end = end
  }

  clone() {
    return new Interval(this.start, this.end)
  }

  static fromLength(start: number, length: number) {
    return new Interval(start, start + length - 1)
  }

  // /** Returns all ranges not contained in list of ranges */
  // static difference(...ranges: Range[]) {
  //   if (ranges.length === 0) return []

  //   const differences: Range[] = []

  //   for (const [i, range] of [...ranges.entries()].slice(1)) {
  //     const previous = ranges[i - 1]

  //     if (previous.end + 1 < range.start) differences.push(Range.interval(previous.end + 1, range.start - 1))
  //   }

  //   return differences
  // }

  // /** Subtract all ranges from one range */
  // static subtract(from: Range, ...ranges: Range[]) {
  //   if (ranges.length === 0) return [from]

  //   const result: Range[] = []

  //   const min = from.start
  //   const max = from.end

  //   let cursor = min
  //   for (const [i, range] of ranges.entries()) {
  //     if (cursor < range.start) result.push(Range.interval(cursor, range.start - 1))

  //     cursor = range.end + 1
  //   }

  //   if (cursor <= max) result.push(Range.interval(cursor, max))

  //   return result
  // }

  // /** Break "from" range between ranges */
  // static break(from: Range, ...ranges: Range[]): { range: Range; index: number }[] {
  //   if (ranges.length === 0) return [{ range: from, index: -1 }]

  //   const result: { range: Range; index: number }[] = []

  //   const min = from.start
  //   const max = from.end

  //   let cursor = min

  //   for (const [i, range] of ranges.entries()) {
  //     if (cursor < range.start) result.push({ range: Range.interval(cursor, range.start - 1), index: -1 })
  //     result.push({ range, index: i })

  //     cursor = range.end + 1
  //   }

  //   if (cursor <= max) result.push({ range: Range.interval(cursor, max), index: -1 })

  //   return result
  // }

  /** Checks if two intervals (or an interval and a Point) overlap */
  overlap(intervalOrPoint: Interval | Point) {
    if (intervalOrPoint instanceof Interval) return overlap_Intervals(this, intervalOrPoint)
    else return overlap_Interval_Point(this, intervalOrPoint)
  }

  toRange() {
    return new Range(this)
  }

  toString() {
    return `[${this.start}:${this.end}]`
  }
}

/** Checks if two points overlap */
function overlap_Points(A: Point, B: Point) {
  return A.index === B.index
}

/** Checks if two intervals overlap */
function overlap_Intervals(A: Interval, B: Interval) {
  return Math.max(A.start, B.start) - Math.min(A.end, B.end) <= 0
}

/** Check if a Point overlaps with an interval */
function overlap_Interval_Point(A: Interval, B: Point) {
  const { start, end } = A
  const { index: point } = B

  return point > start && point < end
}

export default class Range {
  private _entries: (Point | Interval)[] = []

  // get length() {
  //   const simple = this.simplify()

  //   return simple instanceof Point ? 0 : simple.length
  // }

  // get x() {
  //   const simple = this.simplify()

  //   return simple instanceof Point ? simple.index : simple.start
  // }

  // get y() {
  //   const simple = this.simplify()

  //   return simple instanceof Point ? simple.index : simple.end
  // }

  column(index: `first` | `last`, offset: number = 0) {
    const [first] = this._entries
    const last = this._entries[this._entries.length - 1]

    if (index === `first`) return first instanceof Point ? first.index - offset : first.start
    else if (index === `last`) return last instanceof Point ? last.index - offset : last.end

    throw new Error(`Index "${index}" not implement for returning column number`)
  }

  columnIsPoint(index: `first` | `last`) {
    const column = this.column(index, 0.5)

    return column % 1 !== 0
  }

  constructor(...entries: (Point | Interval | Range)[]) {
    const _entries: (Point | Interval)[] = entries.flatMap(entry => (entry instanceof Range ? [...entry.getEntries()] : [entry]))

    this.addEntry(..._entries)
  }

  static fromPoint(index: number) {
    return new Range(new Point(index))
  }

  static fromInterval(start: number, end: number) {
    return new Range(new Interval(start, end))
  }

  static fromLength(start: number, length: number) {
    return new Range(Interval.fromLength(start, length))
  }

  static fromEntryRange(start: Point | Interval, end: Point | Interval) {
    const range = new Range()

    if (start instanceof Point) range.addEntry(start)

    if (start instanceof Point && end instanceof Point && start.index === end.index) return range

    if (end instanceof Point && end.index - 1 < 0) debugger
    range.addEntry(new Interval(start instanceof Point ? start.index : start.start, end instanceof Point ? end.index - 1 : end.end))

    if (end instanceof Point) range.addEntry(end)

    return range
  }

  static simplif1y(...entries: (Point | Interval)[]): Point | Interval {
    assert(entries.length > 0, `Range must have at least one entry`)

    const allPoints = entries.every(entry => entry instanceof Point)

    // WARN: Unimplemented and untested
    if (allPoints && entries.length > 1) debugger

    if (allPoints) return entries[0] as Point

    const start = Math.min(...entries.map(entry => (entry instanceof Point ? entry.index : entry.start)))
    const end = Math.max(...entries.map(entry => (entry instanceof Point ? entry.index : entry.end)))

    return new Interval(start, end)
  }

  getEntries() {
    return this._entries
  }

  addEntry(...entries: (Interval | Point)[]) {
    for (const entry of entries) {
      // insert entry in sorted order
      const index = this._entries.findIndex(e => (e instanceof Point ? e.index - 0.5 : e.start) > (entry instanceof Point ? entry.index - 0.5 : entry.start))

      if (index === -1) this._entries.push(entry)
      else this._entries.splice(index, 0, entry)
    }

    return this
  }

  simplif1y() {
    return Range.simplif1y(...this._entries)
  }

  split() {
    assert(this._entries.length > 0, `Range must have entries to determine atomics`)

    // if (this._entries.length === 6) debugger

    // const merged: Range[] = []

    // let interval: Range = new Range()
    // for (let i = 0; i < this._entries.length; i++) {
    //   const previous = this._entries[i - 1]
    //   const current = this._entries[i]
    //   const next = this._entries[i + 1]

    //   // no buffer yet
    //   if (interval._entries.length === 0) {
    //     // no buffer, just pass point
    //     if (current instanceof Point) merged.push(new Range(current))
    //     // start buffer with current
    //     else interval.addEntry(current)
    //   } else {
    //     if (current instanceof Point) debugger
    //     else debugger
    //   }
    // }

    const pieces: Range[] = []

    let current: Range = new Range(this._entries[0])
    for (const entry of this._entries.slice(1)) {
      if (entry instanceof Interval && current._entries[0] instanceof Interval) {
        const { end } = last(current._entries)! as Interval
        const { start } = entry

        // if entry continues the interval at current
        if (end + 1 === start) {
          // merge intervals
          //    a.k.a. add interval to range

          current._entries.push(entry)

          continue
        }
      }

      // dont merge
      pieces.push(current)
      current = new Range(entry)
    }

    pieces.push(current)

    // check if some piece has multiple points (no can do)
    for (const piece of pieces) {
      const manyPoints = piece._entries.length > 1 && piece._entries.every(entry => entry instanceof Point)

      assert(!manyPoints, `Split atomics must have at most ONE Point`)
    }

    // sort pieces by start
    // const sorted = orderBy(pieces, piece => (piece.entries[0] instanceof Point ? (piece.entries[0] as Point).index - 0.5 : (piece.entries[0] as Interval).start))

    return pieces
  }

  offsetPoints(offset: number) {
    const first = this._entries[0]
    const last = this._entries[this._entries.length - 1]

    return {
      x: first instanceof Point ? first.index + offset : first.start,
      y: last instanceof Point ? last.index + offset : last.end,
    }
  }

  static toCoordinates(range: Range | Point | Interval, offset: number = 0): { x: number; y: number } {
    if (range instanceof Range) {
      const entries = range.getEntries()
      const first = Range.toCoordinates(entries[0], offset)
      const last = Range.toCoordinates(entries[entries.length - 1], offset)

      return { x: first.x, y: last.y }
    }
    if (range instanceof Point) return { x: range.index + offset, y: range.index + offset }
    if (range instanceof Interval) return { x: range.start, y: range.end }

    throw new Error(`Range is no range`)
  }

  /** Check if range overlaps with another range */
  static overlap(A: Range | Point | Interval, B: Range | Point | Interval, offset: number = 0) {
    const a = Range.toCoordinates(A, -0.5)
    const b = Range.toCoordinates(B, -0.5)

    return Math.max(a.x, b.x) - Math.min(a.y, b.y) <= 0
  }

  overlap(range: Range | Point | Interval, offset: number = 0) {
    return Range.overlap(this, range, offset)
  }

  static compare(range1: Range | Point | Interval, range2: Range | Point | Interval) {
    const A = Range.toCoordinates(range1, -0.5)
    const B = Range.toCoordinates(range2, -0.5)

    // https://www.alanzucconi.com/2015/07/26/enum-flags-and-bitwise-operators/

    // how to compare bitwise
    // X & SAME > 0
    // check exactly: (b & X) === Y
    // check partial: (b & X) !== 0

    const start = A.x === B.x ? STARTS_SAME : A.x < B.x ? STARTS_BEFORE : STARTS_AFTER
    const end = A.y === B.y ? ENDS_SAME : A.y < B.y ? ENDS_BEFORE : ENDS_AFTER

    let result = start | end

    if (A.y < B.x) result |= ENDS_BEFORE_START
    else if (A.y > B.x) result |= ENDS_AFTER_START

    return result
  }

  compare(range: Range | Point | Interval) {
    return Range.compare(this, range)
  }

  subtract(others: (Point | Interval)[]) {
    const final = new Range()

    for (const entry of this._entries) {
      const subtracted = entry instanceof Point ? Range._subtractFromPoint(entry, others) : Range._subtractFromInterval(entry, others)

      final.addEntry(...subtracted)
    }

    return final
  }

  static _subtractFromPoint(point: Point, others: (Point | Interval)[]): (Point | Interval)[] {
    for (const other of others) {
      const bothPointAreEqual = other instanceof Point && other.index === point.index
      const pointIsInInterval = other instanceof Interval && other.start < point.index && point.index <= other.end

      if (bothPointAreEqual || pointIsInInterval) return []
    }

    return [point]
  }

  static _subtractFromInterval0(interval: Interval, others: (Point | Interval)[]): (Point | Interval)[] {
    for (const other of others) {
      const intervalContainsPoint = other instanceof Point && interval.start < other.index && other.index <= interval.end

      if (intervalContainsPoint) {
        const before = new Interval(interval.start, other.index - 1)
        const after = new Interval(other.index, interval.end)

        return [before, after]
      }

      if (other instanceof Interval) {
        // no overlap
        if (interval.end < other.start || interval.start > other.end) continue

        const intervals: (Point | Interval)[] = []

        if (interval.start < other.start) {
          intervals.push(new Interval(interval.start, other.start - 1))
          intervals.push(new Point(other.start))
        }

        if (interval.end > other.end) {
          intervals.push(new Point(other.end + 1))
          intervals.push(new Interval(other.end + 1, interval.end))
        }

        return intervals
      }
    }

    return [interval]
  }

  static _subtractFromInterval(interval: Interval, others: (Point | Interval)[]): (Point | Interval)[] {
    const OFFSET = 0.5
    const intervals: [number, number][] = []

    // pre-filter all others completely outside of interval
    const _others = others.filter(other => {
      const start = other instanceof Point ? other.index - OFFSET : other.start
      const end = other instanceof Point ? other.index - OFFSET : other.end

      return !(end < interval.start || start > interval.end)
    })

    let cursor = interval.start
    for (const other of _others) {
      const start = other instanceof Point ? other.index - OFFSET : other.start
      const end = other instanceof Point ? other.index - OFFSET : other.end

      // there is space between cursor and start
      if (cursor < start) intervals.push([cursor, start - OFFSET])

      cursor = end + OFFSET
    }

    if (cursor <= interval.end) intervals.push([cursor, interval.end])

    const _intervals: (Point | Interval)[] = []
    for (const SE of intervals) _intervals.push(...Range.fromOffsetPoints(SE, OFFSET).getEntries())

    return _intervals
  }

  toString() {
    return `{${this._entries.map(entry => entry.toString()).join(`,`)}}`
  }

  clone() {
    return new Range(...this._entries.map(entry => entry.clone()))
  }

  static sortedInsert<TItem = unknown>(collection: TItem[], range: Range, getRange?: (item: TItem) => Range) {
    getRange ??= (item: TItem) => item as unknown as Range

    const OFFSET = -0.5

    // 1. Find latest sequence that ends before range
    //      -1 means that all sequences end after range.start
    const previous = collection.findLastIndex(item => {
      const itemRange = getRange!(item)

      return itemRange.offsetPoints(OFFSET).y <= range.offsetPoints(OFFSET).x
    })

    // 2. check if range overlaps with previous
    const _previous = getRange(collection[previous])
    if (_previous?.overlap(range)) return -1

    // 3. check if range overlaps with next
    const _next = getRange(collection[previous + 1])
    if (_next?.overlap(range)) return -1

    const index = previous + 1

    return index
  }

  static column(entry: Point | Interval, index: `first` | `last`, offset: number = 0) {
    if (entry instanceof Point) return entry.index - offset

    return index === `first` ? entry.start : entry.end
  }

  static fromOffsetPoints(SE: [number, number], OFFSET: number) {
    const range = new Range()

    const startPoint = SE[0] % 1 !== 0
    const endPoint = SE[1] % 1 !== 0

    const start = startPoint ? SE[0] + OFFSET : SE[0]
    const end = endPoint ? SE[1] - OFFSET : SE[1]

    if (startPoint) range.addEntry(new Point(start))
    if (start <= end) range.addEntry(new Interval(start, end))
    if (endPoint && start !== end + 1) range.addEntry(new Point(end + 1))

    return range
  }

  removeDiscontinuity() {
    const OFFSET = 0.5

    const range = new Range()

    // fill discontinuities
    for (let i = 1; i <= this._entries.length; i++) {
      const previous = this._entries[i - 1]
      const next = this._entries[i]

      const end = Range.column(previous, `last`, OFFSET)
      const start = next ? Range.column(next, `first`, OFFSET) : end

      range.addEntry(previous)

      // there is a discontinuity vetween previous and next
      if (end + OFFSET < start) {
        let entries = Range.fromOffsetPoints([end + OFFSET, start - OFFSET], OFFSET).getEntries()

        range.addEntry(...entries)
      }
    }

    return Range.simplify(range, OFFSET)
  }

  static simplify(range: Range, OFFSET: number) {
    // simplify entries
    const intervals: [number, number][] = []

    const start = range._entries[0] instanceof Point ? range._entries[0].index - OFFSET : range._entries[0].start
    const end = range._entries[0] instanceof Point ? range._entries[0].index - OFFSET : range._entries[0].end
    let cursor: [number, number] = [start, end]

    for (const entry of range._entries.slice(1)) {
      const start = entry instanceof Point ? entry.index - OFFSET : entry.start
      const end = entry instanceof Point ? entry.index - OFFSET : entry.end

      // if there is a gap between cursor and entry
      if (cursor[1] + OFFSET < start) {
        debugger
      } else {
        cursor[1] = end
      }
    }

    intervals.push(cursor)

    const _intervals: (Point | Interval)[] = []
    for (const SE of intervals) _intervals.push(...Range.fromOffsetPoints(SE, OFFSET).getEntries())

    return new Range(..._intervals)
  }
}

const STARTS_BEFORE = 1 << 0
const STARTS_SAME = 1 << 1
const STARTS_AFTER = 1 << 2
const ENDS_BEFORE = 1 << 3
const ENDS_SAME = 1 << 4
const ENDS_AFTER = 1 << 5
const ENDS_BEFORE_START = 1 << 6
const ENDS_AFTER_START = 1 << 7

export const RANGE_COMPARISON = {
  // start: before, same, after
  STARTS_BEFORE,
  STARTS_SAME,
  STARTS_AFTER,
  ENDS_BEFORE,
  ENDS_SAME,
  ENDS_AFTER,
  ENDS_BEFORE_START,
  ENDS_AFTER_START,
  //
  SAME: STARTS_SAME | ENDS_SAME,
}

// const test = Range.break(Range.interval(0, 7), Range.interval(2, 3), Range.interval(5, 6))
// const A = new Range(new Point(0), new Interval(0, 3), new Point(4))
// const B = new Range(new Point(0), new Interval(0, 3)) // 0, [0:3]
// const C = new Range(new Point(0), new Interval(0, 0), new Interval(2, 2)) // 0, [0:0], [2:2]
// const D = new Range(new Point(0), new Interval(0, 0), new Interval(3, 3)) // 0, [0:0], [3:3]

// const E = new Range(new Interval(0, 2))
// const F = new Range(new Point(0), new Interval(0, 0), new Interval(1, 1), new Interval(2, 2))

// const BC = B.subtract(C.getEntries()) // 1, [1:1], 2, 3
// const BD = B.subtract(D.getEntries()) // 1, [1:2], 3
// const EF = E.subtract(F.getEntries())
