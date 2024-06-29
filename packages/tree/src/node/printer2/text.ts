import { SECTIONS } from "./../../../../../apps/gca/src/trait/indexed"
import { has, isArray, isNil, isString, last, orderBy, range, uniq } from "lodash"
import type NodePrinter from "."
import type Node from ".."
import NodeBasePrinter from "./base"
import { Block, Paint, paint } from "../../logger"
import { NodePrinterCell, NodePrinterCellOptions, NodePrinterLine, createCell } from "./cell"
import { re } from "mathjs"

export interface NodeTextPrinterOptions {
  printLevel: boolean
  useWhitespace: boolean
}

/**
 * Print header for node, showing column numbers and source text
 */
export class NodeTextPrinter extends NodeBasePrinter {
  _level: number

  level(level: number) {
    this._level = level
    return this
  }

  print(target: Node, options: Partial<NodeTextPrinterOptions> = {}) {
    this._print(target, options)
  }

  _print(target: Node, options: Partial<NodeTextPrinterOptions> = {}) {
    if (this._level === undefined) debugger

    const { NODES, PADDING, SIZE, CHARACTERS, COLORS, PRINT } = this.setup

    // sort level nodes and fill "empty spaces" between nodes
    const cellsWithNodes = this._cells(NODES[this._level], options)

    // parse nodes into cells
    const cells = [] as NodePrinterCell[]
    for (const _cell of cellsWithNodes) {
      if (!(_cell as any).__node) cells.push(_cell as NodePrinterCell)
      else {
        const node = _cell as Node
        const cell = this._text(node)

        cells.push(...cell)
      }
    }

    this.grid.push(
      NodePrinterLine.make(cells, {
        bakeInnerPadding: true,
        level: this._level,
        prefix: this._level.toString(),
        style: {
          line: [paint.gray],
        },
      }),
    )

    // // print capped and prefixed lines
    // this.printer._line(paint.grey(...text.flat()), {
    //   printLineNumberAsLevel: true,
    //   alternatingLevelColor: [paint.red.bold, paint.magenta.bold],
    // })
  }

  _text(node: Node): NodePrinterCell[] {
    const { NODES, PADDING, SIZE, CHARACTERS, COLORS } = this.setup

    const line = [] as Block[]

    // #region Color

    let colorSource = node as { color: Paint }
    if (COLORS.USE_PARENT_COLOR && node.parent) colorSource = node.parent
    let color = colorSource.color

    //    base syntatic generic coloring
    //      all rules specific to syntax are preferred, base ones are fallback
    const BASE = COLORS.TEXT.BY_SYNTAX[node.syntax.base.toUpperCase()]
    const SYNTAX = COLORS.TEXT.BY_SYNTAX[node.syntax.name.toUpperCase()]

    if (SYNTAX?.BOLD ?? BASE?.BOLD) color = color.bold
    if (SYNTAX?.DIM ?? BASE?.DIM) color = color.dim

    //    custom coloring
    if (node.syntax.name === `math_expression`) color = color.dim

    // #endregion

    const cells = [] as NodePrinterCell[]

    if (node.length === 0) {
      cells.push(
        createCell([color(`⌀`)], node.start - 0.05, {
          // padding: { left: 2, right: 2 },
        }),
      )
    } else {
      let content = node.tree.text
      let tokens = [token(`index`, node.start), token(`index`, node.end! + 1)]

      if (node.syntax.name === `imaginary`) {
        color = paint.gray
      } else if (node.syntax.name === `list`) {
        color = color.bgBlack
      }

      for (const index of node.relevant) {
        const isRange = isArray(index) && index.length == 2

        tokens.push(!isRange ? { type: `single`, index: index as number } : { type: `range`, range: index as [number, number] })
      }

      for (let i = 0; i < tokens.length - 1; i++) {
        const token = tokens[i]
        const nextToken = tokens[i + 1]

        // @ts-ignore
        if (isNil(token.index) && isNil(token.range)) continue

        let start!: number, end!: number
        let tokenColor = color
        const options = {} as Partial<NodePrinterCellOptions>

        if (token.type === `index`) {
          // regular, not special
          start = token.index
          end = nextToken.type === `range` ? nextToken.range[0] : nextToken.index
        } else if (token.type == `single`) {
          // single relevant character
          start = token.index
          end = start + 1

          tokenColor = tokenColor.bold
          options.padding = { left: 1, right: 1 }

          // queue regular token cell after a relevant (to maintain continuity)
          tokens.splice(i + 1, 0, { type: `index`, index: end })
        } else if (token.type === `range`) {
          // start and end of range are relevant characters
          start = token.range[0] + 1
          end = token.range[1]

          // queue regular token cell after a relevant (to maintain continuity)
          tokens.splice(i + 1, 0, { type: `index`, index: end + 1 })
        }

        if (end - start <= 0) continue

        const newCells = [] as NodePrinterCell[]

        newCells.push(createCell([tokenColor(content.slice(start, end))], [start, end - 1], {}))

        // push extremities of range
        if (token.type === `range`) {
          const options = { padding: { left: 1, right: 1 } }

          newCells.unshift(createCell([tokenColor.bold(content[start - 1])], start - 1, options))
          newCells.push(createCell([tokenColor.bold(content[end])], end, options))
        }

        // if (node.context === `l2.a`) debugger

        cells.push(...newCells)
      }
    }

    return cells

    // return createCell([color(content)], range(node.start, node.end + 1), {})
  }
}

type Token =
  | {
      type: `index`
      index: number
    }
  | {
      type: `single`
      index: number
    }
  | {
      type: `range`
      range: [number, number]
    }

function token(type: Token[`type`], data: number | [number, number]) {
  if (type === `index` || type === `single`) return { type, index: data as number }
  else return { type, range: data as [number, number] }
}
