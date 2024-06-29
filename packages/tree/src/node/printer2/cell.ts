import { column } from "mathjs"
import type { FillSpaceOptions } from "."
import { paint, type Block, type Paint } from "../../logger"
import { isArray, isString, sortedIndex } from "lodash"

export interface NodePrinterCellPadding {
  left: number
  right: number
}

export type NodePrinterCellAlignment = `left` | `right` | `center`

export interface NodePrinterCellOptions {
  alignment: NodePrinterCellAlignment
  padding: NodePrinterCellPadding
  map: number[][] // map columns to content indexes -> Record<number, number[]>
  print: Partial<FillSpaceOptions>
}

export interface NodePrinterCell {
  tokens: Block[]
  columns: [number, number] // which columns this cell spans
  //
  padding: NodePrinterCellPadding
  alignment: NodePrinterCellAlignment
  //
  print: Partial<FillSpaceOptions>
}

export function createCell(content: string | Block[], columns: number | [number, number], options: Partial<NodePrinterCellOptions> = {}): NodePrinterCell {
  const _tokens = isString(content) ? [paint.identity(content)] : content
  const _columns = (isArray(columns) ? columns : [columns, columns]) as [number, number]

  if (_columns[0] === 8) debugger

  return {
    tokens: _tokens,
    columns: _columns,
    //
    padding: {
      left: options?.padding?.left ?? 0,
      right: options?.padding?.right ?? 0,
    },
    alignment: options?.alignment ?? `center`,
    //
    print: options?.print ?? {},
  }

  // // a token is what is going to be printed for a specific column
  // let tokens!: NodePrinterToken

  // const length = isString(content) ? content.length : content.map(block => block._data).join(``).length
  // const contentIsString = isString(content)
  // const isRangeOfColumns = columns[0] !== columns[1]

  // const averageWidth = Math.max(1, Math.floor(length / columns.length))
  // const totalLength = averageWidth * columns.length

  // const contentIsSmaller = length < totalLength

  // if (isRangeOfColumns) {
  //   // create a single token that spans all columns, passing a average width for each column
  //   tokens = {
  //     type: `range_of_columns`,
  //     content: contentIsString ? [paint.identity(content)] : content,
  //     columns: [...columns],
  //     width: length,
  //   } as NodePrinterToken_RangeOfColumns
  // } else {
  //   const listOfTokens = [] as NodePrinterToken_SingleColumn[`list`]

  //   // since content length matches columns length, we generate a map in real-time (in the future this map could be an argument, for example)
  //   const map = columns.map((column, index) => [index, index] as [number, number]) // column index -> content range
  //   const _content = contentIsString ? [paint.identity(content)] : content

  //   let contentCursor = 0
  //   let offsetContentIndex = 0
  //   for (let c = 0; c < columns.length; c++) {
  //     const column = columns[c]
  //     const contentRange = map[c]
  //     const width = contentRange[1] - contentRange[0] + 1

  //     if (contentCursor >= _content.length) debugger

  //     let fullLength = 0
  //     const blocks = [] as Block[]
  //     // for (let i = contentCursor; i < _content.length; i++) {
  //     while (contentCursor < _content.length && fullLength < width) {
  //       const contentBlock = _content[contentCursor]
  //       const length = String(contentBlock._data).length - offsetContentIndex

  //       if (fullLength + length > width || offsetContentIndex > 0) {
  //         // content block would overflow mapped with, we should probably break the block
  //         //    probably start from "offsetContentIndex" on cloning the content

  //         const partialBlock = contentBlock._clone()
  //         partialBlock._data = String(contentBlock._data).substring(offsetContentIndex, offsetContentIndex + width)

  //         offsetContentIndex += String(partialBlock._data).length

  //         blocks.push(partialBlock)
  //         fullLength += String(partialBlock._data).length

  //         if (offsetContentIndex >= String(contentBlock._data).length) {
  //           contentCursor++
  //           offsetContentIndex = 0
  //         }
  //       } else {
  //         contentCursor++
  //         offsetContentIndex = 0

  //         blocks.push(contentBlock)
  //         fullLength += length
  //       }
  //     }

  //     // ERROR: Should not be
  //     if (fullLength !== width) debugger

  //     listOfTokens.push({
  //       content: blocks,
  //       column,
  //       width,
  //     })
  //   }

  //   tokens = {
  //     type: `single_column`,
  //     list: listOfTokens,
  //   } as NodePrinterToken_SingleColumn
  // }

  // return {
  //   _content: content,
  //   columns,
  //   tokens,
  //   padding: {
  //     left: options?.padding?.left ?? 0,
  //     right: options?.padding?.right ?? 0,
  //   },
  //   alignment: options?.alignment ?? `center`,
  //   //
  //   print: options?.print ?? {},
  // }
}

export interface NodePrinterLineOptions {
  prefix: string
  prefixWithLineNumber: boolean
  level: number
  //
  style: {
    line?: Paint[]
  }
  //
  bakeInnerPadding: boolean
  ignoreBetween: boolean
}

export class NodePrinterLine {
  cells: Record<number, NodePrinterCell[]> = {}
  columns: number[] = []
  level?: number
  //
  prefix: string
  prefixWithLineNumber: boolean
  //
  style: {
    line: Paint[]
  }
  //
  bakeInnerPadding: boolean
  ignoreBetween: boolean

  constructor(options: Partial<NodePrinterLineOptions> = {}) {
    this.level = options.level

    this.prefix = options?.prefix ?? ``
    this.prefixWithLineNumber = options?.prefixWithLineNumber ?? false

    this.style = {
      line: options?.style?.line ?? [],
    }

    this.ignoreBetween = options?.ignoreBetween ?? false
  }

  static make(cells: NodePrinterCell[], options: Partial<NodePrinterLineOptions> = {}) {
    const line = new NodePrinterLine(options)
    line.add(...cells)
    return line
  }

  add(...cells: NodePrinterCell[]) {
    for (const cell of cells) this._add(cell)
  }

  _add(cell: NodePrinterCell) {
    const firstColumn = cell.columns[0]
    if (!this.columns.includes(firstColumn)) {
      const index = sortedIndex(this.columns, firstColumn)
      this.columns.splice(index, 0, firstColumn)
    }

    if (!this.cells[firstColumn]) this.cells[firstColumn] = []
    this.cells[firstColumn].push(cell)
  }

  allCells() {
    const cells = [] as NodePrinterCell[]
    for (const column of this.columns) {
      cells.push(...this.cells[column])
    }
    return cells
  }
}
