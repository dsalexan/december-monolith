import { orderBy, range } from "lodash"
import type NodePrinter from "."
import type { NodePrinterSubstringTextGetter } from "."
import type Node from ".."
import { Block, paint } from "../../logger"
import { NodePrinterCell, createCell } from "./cell"

export default class NodeBasePrinter {
  printer: NodePrinter

  constructor(printer: NodePrinter) {
    this.printer = printer
  }

  // #region Getters

  get node() {
    return this.printer.node
  }

  get options() {
    return this.printer.options
  }

  get setup() {
    return this.printer.setup
  }

  get logger() {
    return this.setup.logger
  }

  get grid() {
    return this.printer.grid
  }

  // #endregion

  // #region Utils

  /**
   * Returns componentes for single line containing all nodes in argument AND filling the gaps with whitespace OR original source text
   */
  _cells(nodes: Node[], options: Partial<{ useWhitespace: boolean }> = {}): (NodePrinterCell | Node)[] {
    const { NODES, PADDING, SIZE, CHARACTERS, SOURCE_TEXT } = this.setup

    const USE_WHITESPACE = options.useWhitespace ?? false
    const TEXT = USE_WHITESPACE ? CHARACTERS.WHITESPACE.repeat(SOURCE_TEXT.length) : SOURCE_TEXT

    // sort nodes
    const orderedNodes = orderBy(nodes, [`start`], [`asc`])
    const debug_orderedNodes = orderedNodes.map(node => ({ node, start: node.start, end: node.end }))

    const cells = [] as (NodePrinterCell | Node)[]

    // fill gaps
    let cursor = 0
    for (let i = 0; i < orderedNodes.length; i++) {
      const previousNode = orderedNodes[i - 1] ?? { end: 0 }
      const nextNode = orderedNodes[i + 1]
      let node = orderedNodes[i]

      const prefix = node.start - cursor

      // space between nodes
      if (prefix > 0) {
        const _range = range(cursor, node.start)
        const substring = _range.map(i => TEXT[i]).join(``)

        cells.push(createCell(substring, [cursor, node.start - 1]))
      }

      cells.push(node)
      cursor = node.end! + 1
    }

    // append suffix for last node
    //    space between nodes
    if (cursor < SIZE.SOURCE_TEXT) {
      const _range = range(cursor, SIZE.SOURCE_TEXT)
      const substring = _range.map(i => TEXT[i]).join(``)

      cells.push(createCell(substring, [cursor, SIZE.SOURCE_TEXT - 1]))
    }

    return cells
  }

  // #endregion

  print(node: Node) {
    this._print(node)
  }

  _print(node: Node) {
    throw new Error(`Not implemented for base printer`)
  }
}
