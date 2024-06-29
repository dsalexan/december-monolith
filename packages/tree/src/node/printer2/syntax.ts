import { has, isArray, isString, last, orderBy, range } from "lodash"
import type NodePrinter from "."
import type Node from ".."
import NodeBasePrinter from "./base"
import { Block, Paint, paint } from "../../logger"
import { NodePrinterCell, NodePrinterLine, createCell } from "./cell"

export interface NodeSyntaxPrinterOptions {
  printLevel: boolean
  useWhitespace: boolean
}

/**
 * Print header for node, showing column numbers and source text
 */
export class NodeSyntaxPrinter extends NodeBasePrinter {
  _level: number

  level(level: number) {
    this._level = level
    return this
  }

  print(target: Node, options: Partial<NodeSyntaxPrinterOptions> = {}) {
    this._print(target, options)
  }

  _print(target: Node, options: Partial<NodeSyntaxPrinterOptions> = {}) {
    if (this._level === undefined) debugger

    const { NODES, PADDING, SIZE, CHARACTERS, COLORS, PRINT } = this.setup

    // sort level nodes and fill "empty spaces" between nodes
    const cellsWithNodes = this._cells(NODES[this._level], { ...options, useWhitespace: true })

    // parse nodes into cells
    const cells = [] as NodePrinterCell[]
    for (const _cell of cellsWithNodes) {
      if (!(_cell as any).__node) cells.push(_cell as NodePrinterCell)
      else {
        const node = _cell as Node
        const cell = this._syntax(node)

        cells.push(...cell)
      }
    }

    this.grid.push(
      NodePrinterLine.make(cells, {
        level: this._level,
        prefix: PRINT.TEXT ? `` : this._level.toString(),
        ignoreBetween: true,
        style: {
          line: [paint.gray],
        },
      }),
    )
  }

  _syntax(node: Node): NodePrinterCell[] {
    const { NODES, PADDING, SIZE, CHARACTERS, COLORS } = this.setup

    // #region Color
    let edgeColor = paint.white

    let fillColorSource = node
    if (COLORS.USE_PARENT_COLOR && node.parent) fillColorSource = node.parent
    let fillColor = fillColorSource.color

    let DIM = false

    //    custom coloring
    if (node.syntax.name.startsWith(`math_`)) fillColor = fillColorSource.backgroundColor
    if (node.syntax.name === `math_variable`) DIM = true
    if (node.syntax.name === `directive`) fillColor = fillColor.underline

    //    base syntatic generic coloring
    if (COLORS.SYNTAX?.FILL.DIM || DIM) fillColor = fillColor.dim
    if (COLORS.SYNTAX?.EDGES.DIM || DIM) edgeColor = edgeColor.dim

    //    bolding
    fillColor = fillColor.bold
    edgeColor = edgeColor.dim
    // edgeColor = edgeColor.bold

    // #endregion

    const cells = [] as NodePrinterCell[]

    let content = node.context
    let columns = [node.start, node.end!] as number | [number, number]

    if (node.syntax.name === `string`) content = content.replace(`.`, ``).replace(`x`, ``)
    else if (node.length === 0) columns = node.start - 0.05

    cells.push(
      createCell([fillColor(content)], columns, {
        print: {
          edges: [`|`, `|`],
          empty: `-`,
          style: {
            edges: edgeColor,
            empty: edgeColor,
          },
          dontPrioritizeEdge: true,
        },
      }),
    )

    return cells
  }
}
