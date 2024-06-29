import { groupBy, last, orderBy, range } from "lodash"
import type Node from ".."

export interface Range {
  id: number
  minimumWidth: number
  nodes: Node[] // I could store as a Record<level, Node[]>, but performance here is not a problem
}

export default class RangeManager {
  list: Record<string | number, Range> = {} // rangeID -> range

  _nextId = 0
  _byNode = {} as Record<number | string, number[]> // node -> rangeID[]

  get size() {
    return Object.keys(this.list).length
  }

  createRange(id: number): Range {
    return {
      id,
      minimumWidth: 1,
      nodes: [],
    }
  }

  /**
   * Add a node to the range manager
   */
  add(node: Node) {
    const shouldAddNewRange = node.children.length === 0 // only create new range if node is a leaf

    let rangeIDs: number[]
    if (shouldAddNewRange) {
      const id = this._nextId++ // next id
      rangeIDs = [id]

      const range: Range = this.createRange(id)

      if (this.list[id]) debugger
      this.list[id] = range
    } else {
      // if node is not leaf, DO NOT ADD A NEW RANGE
      rangeIDs = []

      // sort nodes
      const children = orderBy(node.children, [`start`], [`asc`])

      // account for gaps in offspring
      let cursor = 0
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const childRange = this._byNode[child.id]
        if (!childRange) debugger

        const prefix = child.start - cursor

        // there is a prefix gap
        if (prefix > 0) {
          // make a NEW RANGE for the gap
          const gapRangeID = childRange[0] - 0.5
          const gapRange = this.createRange(gapRangeID)

          if (this.list[gapRangeID]) debugger
          this.list[gapRangeID] = gapRange

          rangeIDs.push(gapRangeID)
        }

        // all child range bands are also node range bands
        rangeIDs.push(...childRange)

        cursor = child.end! + 1
      }

      // append suffix for last node
      //    space between nodes
      if (cursor < node.tree.text.length) {
        const lastChildRange = this._byNode[last(children)!.id]

        // make a NEW RANGE for the gap
        const gapRangeID = last(lastChildRange)! + 0.5
        const gapRange = this.createRange(gapRangeID)

        if (this.list[gapRangeID]) debugger
        this.list[gapRangeID] = gapRange

        rangeIDs.push(gapRangeID)
      }
    }

    // pre-index shit
    //    node -> range
    this._byNode[node.id] = rangeIDs

    //    range -> nodes (mostly to calculate sizes after determining ranges)
    for (const rangeID of rangeIDs) {
      const range = this.list[rangeID]
      range.nodes.push(node)
    }
  }

  node(node: Node) {
    const rangeIDs = this._byNode[node.id]
    if (!rangeIDs) debugger
    return rangeIDs
  }

  /**
   * Normalize range IDs
   */
  normalize() {
    const keys = Object.keys(this.list).map(key => parseFloat(key))

    const rangeIDs = keys.sort()

    const normalizedList: Record<string | number, Range> = {}
    const normalized_byNode = {} as Record<number | string, number[]> // node -> rangeID[]

    for (let newRangeID = 0; newRangeID < rangeIDs.length; newRangeID++) {
      const oldRangeID = rangeIDs[newRangeID]
      const range = this.list[oldRangeID]

      normalizedList[newRangeID] = {
        id: newRangeID,
        minimumWidth: range.minimumWidth,
        nodes: [...range.nodes],
      }

      // re-index by node
      for (const node of range.nodes) {
        if (!normalized_byNode[node.id]) normalized_byNode[node.id] = []
        normalized_byNode[node.id].push(newRangeID)
      }
    }

    this.list = normalizedList
    this._byNode = normalized_byNode
  }

  /**
   * Calculate minimum width for each range (based on what is going to be printed for each node)
   */
  calculate() {
    const keys = Object.keys(this.list)

    for (let i = 0; i < keys.length; i++) {
      const rangeID = keys[i]
      const range = this.list[rangeID]
      range.minimumWidth = 1

      const nodesByLevel = groupBy(range.nodes, node => node.level)

      for (const [level, nodes] of Object.entries(nodesByLevel)) {
        let width = 1

        // TODO: Calculate minimum width

        if (width > range.minimumWidth) range.minimumWidth = width
      }
    }
  }
}
