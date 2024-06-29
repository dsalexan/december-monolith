import { column } from "mathjs"
import { indexOf, isBoolean, isEmpty, isNil, isString, last, orderBy, range, sortBy, sortedIndex, sum, unzip } from "lodash"

import { asArray } from "@december/utils"

import churchill, { Block, Paint, paint } from "../../logger"
export const logger = churchill.child(`node`, undefined, { separator: `` })

import type Node from ".."
import { NodePrinterSetup, NodePrinterOptions, defaultOptions, PrintSection } from "./options"
import { NodeContextPrinter } from "./context"
import { NodeHeaderPrinter } from "./header"
import { NodePrinterLine, createCell } from "./cell"
import { NodeTextPrinter } from "./text"
import { NodeSyntaxPrinter } from "./syntax"

export type NodePrinterSubstringTextGetter = ((index: number) => Block | Block[]) | (() => Block | Block[])

export interface NodePrinterLineOptions {
  onlyFirstLine: boolean // only print first line, whatever the cap
  content: string
  style: Paint
  // printLevel: boolean // prefix line with level (only first line)
  // printLineNumberAsLevel: boolean // prefix line with "line number" (which i'm assuming to be related to the number of lines generated post-capping)
  // alternatingLevelColor: Paint[]
  // level: number
}

export type ColumnID = string

interface NodePrinterColumn {
  id: ColumnID
  order: number
  width: number
  padding: [number, number]
  //
  isFirst: boolean
  isLast: boolean
}

export const NodePrinterColumnMargin = 0.495

export class NodePrinterColumns {
  /**
   * Space between columns, determined by max padding between columns
   * I-1 is not a "real column", but just the space before the Ith column (since space after N-1th column is already N-1)
   * [I-1, I, I+1    ... N-2, N-1]
   *
   *     I        I+1         I+2       ...      N-2          N-1
   *   bI aI   bI+1 aI+1   bI+2 aI+2          bN-2 aN-2    bN-1 aN-1
   * I-1     I          I+1        I+2  ...  N-3       N-2          N-1
   */
  _id: Record<number, ColumnID> = {}
  order: Record<ColumnID, number> = {}
  between: Record<ColumnID, number> = {}
  width: Record<ColumnID, number> = {}

  get N() {
    return Object.keys(this._id).length
  }

  get inOrder(): ColumnID[] {
    return range(0, this.N).map(id => String(id))
  }

  get(id: ColumnID): NodePrinterColumn {
    const order = this.order[id]
    const width = this.width[id]

    const before = this.between[String(Number(id) - 1)] ?? 0
    const after = this.between[id] ?? 0

    const padding = [before, after] as [number, number]

    return {
      id,
      order,
      width,
      padding,
      //
      isFirst: order === 0,
      isLast: order === this.N - 1,
    }
  }

  inject(_id: Record<number, ColumnID>, order: Record<ColumnID, number>, between: Record<ColumnID, number>, width: Record<ColumnID, number>) {
    this._id = _id
    this.order = order
    this.between = between
    this.width = width
  }

  from(start: number, end: number, margin = NodePrinterColumnMargin): NodePrinterColumn[] {
    const columns = [] as number[]

    const _start = start - margin
    const _end = end + margin

    let index = -1
    for (let id = 0; id < this.N; id++) {
      const order = this.order[id]

      if (order >= _start && order <= _end) {
        index = id
        break
      }
    }

    if (index === -1) debugger

    for (let i = index; i < this.N && this.order[this.inOrder[i]] <= _end; i++) {
      const order = this.order[this.inOrder[i]]
      columns.push(order)
    }

    return columns.map(order => this.get(this._id[order]))
  }
}

export default class NodePrinter {
  node: Node

  // options are always defined at print time
  options!: Partial<NodePrinterOptions>
  setup!: NodePrinterSetup
  grid: NodePrinterLine[] = []
  columns: NodePrinterColumns

  context: NodeContextPrinter
  header: NodeHeaderPrinter
  text: NodeTextPrinter
  syntax: NodeSyntaxPrinter

  constructor(node: Node) {
    this.node = node

    this.columns = new NodePrinterColumns()

    this.context = new NodeContextPrinter(this)
    this.header = new NodeHeaderPrinter(this)
    this.text = new NodeTextPrinter(this)
    this.syntax = new NodeSyntaxPrinter(this)
  }

  // #region Utils

  // #endregion

  _defaultOptions(options: Partial<NodePrinterOptions> = {}) {
    this.options = options
    this.setup = defaultOptions(this, options)
  }

  printText() {
    const characters = [...this.node.tree.text]
    const charactersAndIndexes = characters.map((character, index) => [index, character])

    const separatorSize = this.node.tree.text.length.toString().length

    const [indexes, allCharacters] = unzip(charactersAndIndexes) as [number[], string[]]

    logger.add(paint.grey(indexes.map(index => index.toString().padEnd(separatorSize)).join(` `))).debug()
    logger.add(paint.grey(allCharacters.map(character => character.padEnd(separatorSize)).join(` `))).debug()
  }

  print(options: Partial<NodePrinterOptions> = {}) {
    this._defaultOptions(options)

    this.grid = []
    this.columns = new NodePrinterColumns()

    this._mount()
    this._prepare()
    this._print()

    /**
     * 1. Setup options
     * 2. Prepare node tree as lines
     * 3. Print (align columns if necessary)
     */
  }

  _mount() {
    const { MAX_LEVEL, PRINT, SOURCE_TEXT } = this.setup

    if (PRINT.CONTEXT) this.context.print(this.node)
    if (PRINT.HEADER) this.header.print(this.node)
    if (PRINT.CONTEXT || PRINT.HEADER) {
      const cell = createCell(`-`, PRINT.RANGE, {
        print: {
          between: `-`,
          empty: `-`,
        },
      })
      this.grid.push(
        NodePrinterLine.make([cell], {
          style: {
            line: [paint.grey],
          },
        }),
      )
    }

    for (let i = 0; i < MAX_LEVEL; i++) {
      const level = this.node.level + i
      if (!PRINT.LEVELS.includes(level)) continue

      if (PRINT.PARENT_NODES) {
        // this.printLevelNodes(log, level - 2, { printLevel: true })
        // this.printLevelNodes(log, level - 1, { printLevel: true })
      }

      if (PRINT.TEXT) {
        const _text = this.text.level(level)
        _text.print(this.node, { printLevel: true })
      }

      if (PRINT.SYNTAX) {
        const _syntax = this.syntax.level(level)
        _syntax.print(this.node, { printLevel: false })
      }
    }
  }

  _prepare() {
    const { logger, ALIGN, PRINT, ROOT_MAX_LEVEL } = this.setup

    if (!ALIGN) debugger

    // determine level range to calculate paddings
    let CALCULATE_PADDING_AT_LEVELS = this.options.calculate?.levels ?? PRINT.LEVELS
    if (this.options.calculate?.upTo !== undefined) CALCULATE_PADDING_AT_LEVELS = range(0, this.options.calculate?.upTo + 1)
    if (this.options.calculate?.from !== undefined) CALCULATE_PADDING_AT_LEVELS = range(this.options.calculate?.from, ROOT_MAX_LEVEL)

    // TODO: Adapt PRINT.RANGE to continuous columns

    // instantiate each column
    const columns = {} as Record<number, string> // ColumnID[]
    const orders = [] as number[] //  | column id -> column order
    const widths = {} as Record<ColumnID, number>
    const betweens = {} as Record<ColumnID, number>
    betweens[`-1`] = 0 // there will always be a "before" for the first column

    for (const line of this.grid) {
      for (const cell of line.allCells()) {
        // cell.columns -> columns
        const isSingleColumn = cell.columns[0] === cell.columns[1]

        let _columns = isSingleColumn ? [cell.columns[0]] : range(cell.columns[0], cell.columns[1] + 1)

        for (const column of _columns) {
          // cell only knows the numeric value, the "priority" or "order" of a column
          const order = column

          // instantiate new column if it does not exist
          if (!orders.includes(order)) {
            // this is the "Column ID", how I will identify each column from now on
            const id = sortedIndex(orders, order)

            orders[id] = order
          }
        }
      }
    }

    for (let id = 0; id < orders.length; id++) {
      const order = orders[id]
      columns[order] = String(id)
      widths[id] = 1
      betweens[id] = 0
    }

    this.columns._id = columns
    this.columns.order = orders as any
    // eslint-disable-next-line prettier/prettier
    // const columns = Object.keys(orders).map(id => Number(id)).sort().map(id => String(id))

    // calculate widths and paddings for each column
    for (const line of this.grid) {
      const shouldCalculateLevel = isNil(line.level) || CALCULATE_PADDING_AT_LEVELS.includes(line.level)

      // calculate additive width per line
      const lineWidths = {} as Record<ColumnID, number>
      for (const column of this.columns.inOrder) lineWidths[column] = 0

      for (const cell of line.allCells()) {
        // cell.length -> column.width
        const width = sum(cell.tokens.map(token => String(token._data).length))

        const columns = this.columns.from(cell.columns[0], cell.columns[1], 0)

        // update widths considering an average width among all columns
        const averageWidth = Math.max(1, Math.floor(width / columns.length))
        const totalWidth = averageWidth * columns.length

        if (width > totalWidth) debugger

        for (let i = 0; i < columns.length; i++) {
          const column = columns[i].id
          const width = averageWidth

          lineWidths[column] += width
        }

        // cell.padding -> between
        if (shouldCalculateLevel) {
          /**
           * Space between columns, determined by max padding between columns
           * I-1 is not a "real column", but just the space before the Ith column (since space after N-1th column is already N-1)
           * [I-1, I, I+1    ... N-2, N-1]
           *
           *     I        I+1         I+2       ...      N-2          N-1
           *   bI aI   bI+1 aI+1   bI+2 aI+2          bN-2 aN-2    bN-1 aN-1
           * I-1     I          I+1        I+2  ...  N-3       N-2          N-1
           */

          const left = Number(columns[0].id)
          const right = Number(last(columns)!.id)

          betweens[left - 1] = Math.max(betweens[left - 1], cell.padding.left)
          betweens[right] = Math.max(betweens[right], cell.padding.right)
        }
      }

      // assign max width
      for (const column of this.columns.inOrder) {
        const lineWidth = lineWidths[column]

        const maxWidth = Math.max(widths[column], lineWidth)

        if (isNaN(maxWidth)) debugger

        widths[column] = maxWidth
      }
    }

    // inject data into columns
    this.columns.inject(columns, orders as any, betweens, widths)

    // #region Debug

    logger.add(...this._prefix())

    for (const id of this.columns.inOrder) {
      const column = this.columns.get(id)

      const text = fillSpace([paint.magentaBright(String(column.order))], column.width, column.padding, {
        isLastColumn: column.isLast,
        edges: false,
        empty: `□`,
        between: `·`,
      })

      const _blocks = paint.grey(text)
      logger.add(..._blocks)
    }

    logger.add(paint.gray(` (_prepare)`))

    logger.debug()

    // #endregion
  }

  _prefix(options: Partial<NodePrinterLineOptions> = {}) {
    const { PADDING, SIZE, CHARACTERS, PRINT } = this.setup

    const content = options.content ?? ``

    const prefix = [] as Block[]

    const color = options.style ?? paint.grey
    const padding = PADDING.LEVEL - (isEmpty(content) ? 0 : String(content).length)

    prefix.push(color(content))
    prefix.push(paint.identity(` `.repeat(padding)))

    return prefix
  }

  _cap(content: Block[]) {
    const { SIZE } = this.setup

    const cappedLines = [] as Block[][]

    if (SIZE.LINE_LEVEL_PADDED === Infinity) {
      cappedLines.push(content)
    } else {
      let currentLine = [] as Block[]

      let lineLength = 0
      while (content.length > 0 && lineLength < SIZE.LINE_LEVEL_PADDED) {
        const block = content.shift()
        const length = String(block._data).length

        const remaining = SIZE.LINE_LEVEL_PADDED - lineLength

        if (length <= remaining) {
          currentLine.push(block)
          lineLength += length
        } else {
          // break block
          const A = block._clone()
          A._data = String(block._data).slice(0, remaining)

          const B = block._clone()
          B._data = String(block._data).slice(remaining)

          content.unshift(B)

          currentLine.push(A)
          lineLength += remaining
        }

        if (lineLength === SIZE.LINE_LEVEL_PADDED) {
          cappedLines.push(currentLine)
          currentLine = []
          lineLength = 0
        }
      }

      if (currentLine.length > 0) cappedLines.push(currentLine)
    }

    return cappedLines
  }

  _print() {
    const { logger, ALIGN, SIZE } = this.setup

    for (let l = 0; l < this.grid.length; l++) {
      const line = this.grid[l]

      const cells = line.allCells()
      const lineStyles = line.style.line ?? []

      // prefix
      logger.add(...this._prefix({ content: line.prefix, style: paint.red.bold }))

      // build line content
      const content = [] as Block[]
      for (const cell of cells) {
        const columns = this.columns.from(...cell.columns)

        const availableSpace = sum(columns.map(column => column.width))

        // inner padding
        const _innerPadding = columns.slice(1).map(column => column.padding[0])
        const innerPadding = sum(_innerPadding)

        // outer padding
        const before = columns[0]
        const after = last(columns)!

        const beforeFirst = before.padding[0]
        const afterLast = after.padding[1]

        // if (cell.columns[0] === cell.columns[1]) debugger

        // content
        const text = fillSpace(cell.tokens, availableSpace + innerPadding, [beforeFirst, afterLast], {
          isLastColumn: after.isLast,
          //
          ignoreBetween: line.ignoreBetween,
          edges: false,
          alignment: cell.alignment,
          ...cell.print,
        })

        content.push(...text)

        // } else if (cell.tokens.type === `single_column`) {
        //   for (let j = 0; j < cell.tokens.list.length; j++) {
        //     const token = cell.tokens.list[j]
        //     const column = this.columns.get(this.columns._id[token.column])

        //     // content
        //     const text = fillSpace(token.content, column.width, column.padding, {
        //       isLastColumn: column.isLast,
        //       //
        //       ignoreBetween: line.ignoreBetween,
        //       edges: false,
        //       alignment: cell.alignment,
        //       ...cell.print,
        //     })

        //     content.push(...text)
        //   }
        // } else {
        //   // ERROR: Token not implemented
        //   debugger
        // }
      }

      // cap line to size
      const cappedLines = this._cap(content)

      // apply line style
      for (const _line of cappedLines) {
        // TODO: Alternate line style
        const style = lineStyles[0]

        if (style) logger.add(...style(_line))
        else logger.add(..._line)

        logger.debug()
      }
    }
  }
}

export interface FillSpaceOptions {
  edges: boolean | [string, string]
  single: string
  between: string
  empty: string
  //
  style: {
    edges?: Paint
    empty?: Paint
  }
  //
  dontPrioritizeEdge: boolean
  alignment: `left` | `right` | `center`
  ignoreBetween: boolean
  //
  isFirstColumn: boolean
  isLastColumn: boolean
}

function fillSpace(content: Block[], _size: number, padding?: [number, number], options: Partial<FillSpaceOptions> = {}) {
  const length = sum(content.map(block => String(block._data).length))

  const size = _size // (options.ignoreBetween ? padding[1] ?? 0 : 0) + _size

  let text = [] as Block[]

  // CONSTANTS
  //    const edges = (options.edges ?? [`[`, `]`]) as [string, string]
  let edges = [`[`, `]`] as [string, string]
  if (!isBoolean(options.edges) && !isNil(options.edges)) edges = options.edges
  const single = options.single ?? `|`
  const empty = options.empty ?? ` ` // □
  const between = options.between ?? ` ` // ·

  const edgeStyle = options.style?.edges ?? paint.identity
  const emptyStyle = options.style?.empty ?? paint.identity
  const betweenStyle = paint.grey

  const alignment = options.alignment ?? `center`

  let TOTAL_LENGTH = 0

  // should show edges?
  let showEdges = true

  // by default only if there is space for content OR there is not space for content, but edges it does
  if (options.edges === undefined) showEdges = length + 2 <= size || (length > size && 2 <= size)
  else if (options.edges === false) showEdges = false

  const thereIsSpaceForEdges = !showEdges ? false : (options?.dontPrioritizeEdge ? length + 2 : 2) <= size
  const thereIsSpaceForContent = length <= size
  const thereIsFreeSpace = (showEdges ? length + 2 : length) < size

  if (thereIsSpaceForContent) {
    text.push(...content)
    TOTAL_LENGTH += length
  }

  // fill with spaces
  if (thereIsFreeSpace) {
    // pad with spaces
    const remaining = size - (showEdges ? 2 : 0) - (thereIsSpaceForContent ? length : 0)
    let firstHalf = Math.ceil(remaining / 2)
    let secondHalf = remaining - firstHalf

    if (alignment === `left`) {
      firstHalf = 0
      secondHalf = remaining
    } else if (alignment === `right`) {
      firstHalf = remaining
      secondHalf = 0
    }

    if (firstHalf > 0) text.unshift(emptyStyle(empty.repeat(firstHalf)))
    if (secondHalf > 0) text.push(emptyStyle(empty.repeat(secondHalf)))

    TOTAL_LENGTH += firstHalf + secondHalf
  }

  if (thereIsSpaceForEdges) {
    text.unshift(edgeStyle(edges[0]))
    text.push(edgeStyle(edges[1]))

    TOTAL_LENGTH += 2
  }

  // if there is no space at all, try to print raw content or a pipe
  if (!thereIsSpaceForContent && !thereIsFreeSpace && !thereIsSpaceForEdges) {
    text = length <= size ? [...content] : [edgeStyle(single)]

    TOTAL_LENGTH += length <= size ? length : 1
  }

  // inject padding
  let [before, after] = padding ?? [0, 0]

  if (options.ignoreBetween) {
    // before = Math.min(before, size - TOTAL_LENGTH)
    // after = Math.min(after, size - TOTAL_LENGTH - before)
  }

  if (before > 0) text.unshift(betweenStyle(between.repeat(before)))
  if (after > 0 && options.isLastColumn) text.push(betweenStyle(between.repeat(after)))

  // ERROR: Should not happen
  if (text.length === 0) debugger

  return text
}
