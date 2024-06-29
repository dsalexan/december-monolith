import { push } from "@december/utils"
import { last, range } from "lodash"
import type NodePrinter from "."
import type Node from ".."
import NodeBasePrinter from "./base"
import { Block, paint } from "../../logger"
import { NodePrinterCell, NodePrinterLine, createCell } from "./cell"

/**
 * Print header for node, showing column numbers and source text
 */
export class NodeHeaderPrinter extends NodeBasePrinter {
  _print(target: Node) {
    const { MAX_LEVEL, SIZE, PADDING, CHARACTERS, PRINT, NODES } = this.setup

    this._columnNumbersDigits(target)
    this._sourceText(target)
  }

  _columnNumbersDigits(target: Node) {
    const { MAX_LEVEL, SIZE, PADDING, CHARACTERS, PRINT, NODES } = this.setup

    const MAX_DIGITS = SIZE.SOURCE_TEXT.toString().length

    // for each digit
    for (let d = 0; d < MAX_DIGITS; d++) {
      const e = MAX_DIGITS - d - 1 // exponent (i.e. d = 0 <=> e = 2 for 100)
      const e10 = Math.pow(10, e) // 10^e, 10^2 === 100

      let cells = [] as NodePrinterCell[]

      let overflow = 0
      // determine text for each "column" in source
      for (const column of range(PRINT.RANGE[0], PRINT.RANGE[1] + 1)) {
        const columnString = column.toString()
        const numberOfDigits = columnString.length

        // change color if column is a multiple of 10^e
        let color = paint.green
        let tens = Math.floor(parseInt(columnString.substring(numberOfDigits - 2)) / 10)
        if (tens % 2 === 0) color = paint.cyan

        // (0-9) get last digit of column number
        let text = last(columnString)!

        let cell!: NodePrinterCell
        // (10+) only print if column is a multiple of 10^e (10, 20, ..., 100, 200, ..., 1000, 2000, ...)
        if (e === 0) cell = createCell([color(text)], column)
        else {
          // e > 0
          if (column % e10 === 0) {
            cell = createCell([color(columnString)], [column, Math.min(column + e10, PRINT.RANGE[1] + 1)], {
              alignment: `left`,
            })
          }
          // if (column % e10 === 0) {
          //   text = columnString

          //   if (numberOfDigits > 1) overflow = numberOfDigits
          // } else text = overflow-- > 1 ? `` : ` `
        }

        if (cell) cells.push(cell)
      }

      // "print" line
      this.grid.push(
        NodePrinterLine.make(cells, {
          prefixWithLineNumber: true,
          style: {
            // line: [paint.red.bold, paint.magenta.bold],
          },
        }),
      )
    }
  }

  _columnNumbers(target: Node) {
    const { MAX_LEVEL, SIZE, PADDING, CHARACTERS, PRINT, NODES } = this.setup

    const cells = [] as NodePrinterCell[]

    for (const column of range(PRINT.RANGE[0], PRINT.RANGE[1] + 1)) {
      let content = String(column)
      content = content[content.length - 1]

      const cell = createCell(content, column)

      cells.push(cell)
    }

    this.grid.push(
      NodePrinterLine.make(cells, {
        prefixWithLineNumber: true,
        style: {
          // line: [paint.red.bold, paint.magenta.bold],
        },
      }),
    )
  }

  _sourceText(target: Node) {
    const { SOURCE_TEXT, MAX_LEVEL, SIZE, PADDING, CHARACTERS, PRINT, NODES } = this.setup

    const cells = [] as NodePrinterCell[]

    for (const column of range(PRINT.RANGE[0], PRINT.RANGE[1] + 1)) {
      const character = SOURCE_TEXT[column]
      const cell = createCell(character, column)

      cells.push(cell)
    }

    this.grid.push(
      NodePrinterLine.make(cells, {
        // style: { line: [paint.red.bold, paint.magenta.bold] },
      }),
    )
  }
}
