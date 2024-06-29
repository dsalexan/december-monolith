/* eslint-disable no-debugger */
import { chunk, cloneDeep, identity, isString, last, orderBy, padEnd, padStart, range, uniq } from "lodash"

import churchill from "../../../logger"
import { Builder as LogBuilder } from "@december/logger"

import INode from "./interface"
import chalk from "chalk"
import { ANSI, splitOnRegexWithIndex, toName } from "./utils"
import { ranges } from "@december/utils"

export type PrintSections = `header` | `text` | `nodes` | `parent_nodes` | `context`

export type PrintOptions = {
  log: LogBuilder
  //
  levels: number[]
  calculateLevels: number[]
  calculateLevelsUpTo: number
  calculateLevelsFrom: number
  lineSize: number
  lineSizeWithoutLevenPadding: number
  sections: PrintSections[]
  dontRepeatDigitsInHeader: boolean
  onlyRelevantSource: boolean | INode
  //
  useParentColor: boolean
  dimNodes: boolean
  boldString: boolean
  colorInnerOnlyEnclosure: boolean
}

export type PrintSetup = {
  log: LogBuilder
  //
  SOURCE_TEXT: string
  NODES: INode[][]
  MAX_LEVEL: number
  MAX_LEVEL_ROOT: any
  CHARACTERS: {
    PLACEHOLDER: string
    REMAINING_COLUMNS: string
    EMPTYSPACE: string
    WHITESPACE: string
    DASH: string
    EDGES: string[]
  }
  COLORS: {
    TEXT: {
      SYNTAX: {
        STRING: {
          BOLD: boolean
        }
        ENCLOSURE: {
          INNER_ONLY: boolean
        }
      }
    }
    FILL: {
      USE_PARENT_COLOR: boolean
      DIM: boolean
    }
    EDGES: {
      DIM: boolean
    }
  }
  PRINT: {
    LEVELS: number[]
    HEADER: boolean
    TEXT: boolean
    NODES: boolean
    PARENT_NODES: boolean
    CONTEXT: boolean
    SOURCE: [number, number]
    UNIQ_DIGITS: boolean
  }
  SIZE: {
    LINE_MAX: number
    LINE_LEVEL_PADDED: number
    SOURCE_TEXT: number
  }
  PADDING: {
    LEVEL: number
    COLUMN: {
      BEFORE: string
      AFTER: string
    }[]
  }
}

export default class NodePrinter {
  node: INode

  SETUP!: PrintSetup

  constructor(node: INode) {
    this.node = node
  }

  // #region PROXYING

  get parser() {
    return this.node.parser
  }

  get root() {
    return this.parser.root
  }

  get start() {
    return this.node.start
  }

  get end() {
    return this.node.end
  }

  // #endregion

  // #region utils

  /**
   * Returns a substring of the source text, with padding applied to the columns.
   */
  _substring(start: number, end: number, getText?: (index: number) => string) {
    const { PRINT, PADDING, SIZE, CHARACTERS, SOURCE_TEXT } = this.SETUP

    const relevantStart = Math.max(start, PRINT.SOURCE[0])
    const relevantEnd = Math.min(end, PRINT.SOURCE[1])

    if (getText === undefined) getText = index => SOURCE_TEXT[index]

    const columns = [] as string[]
    for (let index = relevantStart; index < relevantEnd; index++) {
      if (PADDING.COLUMN[index] === undefined) debugger
      const { BEFORE, AFTER } = PADDING.COLUMN[index]

      const text = getText(index)

      const isLastColumn = index === SIZE.SOURCE_TEXT - 1 || index === PRINT.SOURCE[1] - 1

      columns.push(`${BEFORE}${text}${isLastColumn ? AFTER : ``}`)
    }

    return columns.join(``)
  }

  /**
   * Breaks a text into lines based on max line size
   * @returns a list of lines, string only
   */
  _cap(text: string, lineSize: number) {
    const { CHARACTERS } = this.SETUP

    // #region setup

    const _noANSIText = splitOnRegexWithIndex(text, ANSI)
    const noANSIText = _noANSIText.map(partial => partial.text).join(``)

    const NO_ANSI_LENGTH = noANSIText.length

    const LINE_SIZE = lineSize // SIZE.LINE_LEVEL_PADDED
    const NECESSARY_LINES = Math.max(1, Math.ceil(NO_ANSI_LENGTH / LINE_SIZE))

    // #endregion

    // #region breaklines

    const lines = [] as string[]

    let cursor = 0
    let overflowOffset = 0
    for (let i = 0; i < NECESSARY_LINES; i++) {
      // get text substring to fill a line
      let line = ``
      let lineColorlessLength = 0
      while (lineColorlessLength < LINE_SIZE && cursor < _noANSIText.length) {
        const partial = _noANSIText[cursor++]

        let stringIncrement = partial.text.substring(overflowOffset)

        if (lineColorlessLength + stringIncrement.length > LINE_SIZE) {
          const overflow = lineColorlessLength + stringIncrement.length - LINE_SIZE

          stringIncrement = stringIncrement.substring(0, stringIncrement.length - overflow)

          overflowOffset += partial.text.substring(overflowOffset).length - overflow
          cursor--
        } else {
          overflowOffset = 0
        }

        line = `${line}${partial.before}${stringIncrement}`
        lineColorlessLength += stringIncrement.length
      }

      // adding after for current partial of text
      if (cursor < _noANSIText.length) line = `${line}${_noANSIText[cursor].after}`

      // debug tool to check if line is being broken correctly
      if (CHARACTERS.REMAINING_COLUMNS !== `` && LINE_SIZE !== Infinity) {
        line += chalk.italic.gray.dim(CHARACTERS.REMAINING_COLUMNS.repeat(LINE_SIZE - lineColorlessLength))
      }

      lines.push(line)
    }

    // #endregion

    return lines
  }

  /**
   * Prefix lines with level number
   */
  _prefixWithLevel(
    level: number,
    lines: string[],
    options: Partial<{
      onlyFirstLine: boolean
      printLevel: boolean
      printLineNumberAsLevel: boolean
      alternatingLevelColor: (chalk.Chalk | typeof identity)[]
    }> = {},
  ) {
    const { PADDING, SIZE, CHARACTERS } = this.SETUP

    // if we should print level number or just pad the space
    const PRINT_LINE_NUMBER_AS_LEVEL = options.printLineNumberAsLevel ?? false
    const PRINT_LEVEL = (PRINT_LINE_NUMBER_AS_LEVEL || options.printLevel) ?? true

    const prefixedLines = [] as string[]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      let prefix = ``
      let levelColor = chalk.grey

      const doPrintLevelNumber = (PRINT_LEVEL && i === 0) || PRINT_LINE_NUMBER_AS_LEVEL
      if (doPrintLevelNumber) {
        // print level (sometimes) as padding
        const numericValue = PRINT_LINE_NUMBER_AS_LEVEL ? i : level

        if (options.alternatingLevelColor) {
          const colorOptions = options.alternatingLevelColor.length
          const module = numericValue % colorOptions

          levelColor = options.alternatingLevelColor[module] as chalk.Chalk
        }

        const levelText = `${numericValue}`

        prefix = levelColor(levelText) + ` `.repeat(PADDING.LEVEL - levelText.length)
      } else {
        // just pad the space
        prefix = ` `.repeat(PADDING.LEVEL)
      }

      // prefix line
      const prefixedLine = `${prefix}${line}`
      prefixedLines.push(prefixedLine)

      if (options.onlyFirstLine) break
    }

    return prefixedLines
  }

  /**
   * Log lines
   */
  _log(lines: string[]) {
    const { log } = this.SETUP

    for (const line of lines) log.add(line).debug()
  }

  _A(
    level: number,
    text: string,
    options: Partial<{
      onlyFirstLine: boolean
      printLevel: boolean
      printLineNumberAsLevel: boolean
      alternatingLevelColor: (chalk.Chalk | typeof identity)[]
    }> = {},
  ) {
    const { SIZE } = this.SETUP

    const cappedLines = this._cap(text, SIZE.LINE_LEVEL_PADDED)
    const prefixedLines = this._prefixWithLevel(level, cappedLines, options)
    this._log(prefixedLines)
  }

  /**
   * Returns componentes for single line containing all nodes in argument AND filling the gaps with whitespace OR original source text
   */
  _components(nodes: INode[], options: Partial<{ useWhitespace: boolean }> = {}) {
    const { NODES, PADDING, SIZE, CHARACTERS } = this.SETUP
    const USE_WHITESPACE = options.useWhitespace ?? false
    const GET_TEXT = USE_WHITESPACE ? () => CHARACTERS.WHITESPACE : undefined

    const orderedNodes = orderBy(nodes, [`start`], [`asc`])
    const debug_orderedNodes = orderedNodes.map(node => ({ node, start: node.start, end: node.end }))

    const components = [] as (string | INode)[]

    let cursor = 0
    for (let i = 0; i < orderedNodes.length; i++) {
      const previousNode = orderedNodes[i - 1] ?? { end: 0 }
      const nextNode = orderedNodes[i + 1]
      let node = orderedNodes[i]

      const prefix = node.start - cursor

      // space between nodes
      if (prefix > 0) components.push(this._substring(cursor, node.start, GET_TEXT))

      components.push(node)
      cursor = node.end! + 1
    }

    // append suffix for last node
    //    space between nodes
    if (cursor < SIZE.SOURCE_TEXT) components.push(this._substring(cursor, SIZE.SOURCE_TEXT, GET_TEXT))

    return components
  }

  // #endregion

  // #region core

  print(options: Partial<PrintOptions> = {}) {
    this._setup(options)
    this._print()
  }

  _setup(options: Partial<PrintOptions> = {}): PrintSetup {
    const log = options.log ?? churchill.child(`parser`, undefined, { separator: `` })

    const SOURCE_TEXT = this.parser.text

    const ROOT_LEVELS = this.root.getLevels()
    const LEVELS = this.node.getLevels()
    const PRINT_SECTIONS = options.sections ?? [`header`, `text`, `nodes`]

    const MAX_LEVEL_ROOT = ROOT_LEVELS.length
    const MAX_LEVEL = LEVELS.length

    let RELEVANT_SOURCE = [0, SOURCE_TEXT.length] as [number, number]
    if (options.onlyRelevantSource) {
      if (options.onlyRelevantSource === true) RELEVANT_SOURCE = [this.start, this.end! + 1]
      else RELEVANT_SOURCE = [options.onlyRelevantSource.start, options.onlyRelevantSource.end! + 1]
    }

    // foreshadowing to facilitade math
    const foreshadowing_PADDING_LEVEL = `${LEVELS.length}: `.length

    let LINE_SIZE = options.lineSize ?? Infinity
    if (options.lineSizeWithoutLevenPadding !== undefined) {
      LINE_SIZE = options.lineSizeWithoutLevenPadding + foreshadowing_PADDING_LEVEL
    }

    const CHARACTERS = {
      PLACEHOLDER: `.`,
      REMAINING_COLUMNS: ``,
      EMPTYSPACE: ` `,
      //
      WHITESPACE: ` `,
      DASH: `-`,
      EDGES: [`|`, `|`],
    }

    const COLORS = {
      TEXT: {
        SYNTAX: {
          STRING: {
            BOLD: options.boldString ?? false,
          },
          ENCLOSURE: {
            INNER_ONLY: options.colorInnerOnlyEnclosure ?? false,
          },
        },
      },
      FILL: {
        USE_PARENT_COLOR: options.useParentColor ?? false,
        DIM: options.dimNodes ?? false,
      },
      EDGES: {
        DIM: options.dimNodes ?? false,
      },
    }

    const PRINT = {
      LEVELS: options.levels ?? range(0, MAX_LEVEL_ROOT),
      //
      HEADER: PRINT_SECTIONS.includes(`header`),
      TEXT: PRINT_SECTIONS.includes(`text`),
      NODES: PRINT_SECTIONS.includes(`nodes`),
      PARENT_NODES: PRINT_SECTIONS.includes(`parent_nodes`),
      CONTEXT: PRINT_SECTIONS.includes(`context`),
      //
      SOURCE: RELEVANT_SOURCE,
      UNIQ_DIGITS: options.dontRepeatDigitsInHeader ?? false,
    }

    // #region calculate paddings for columns

    let CALCULATE_PADDING_AT_LEVELS = options.calculateLevels ?? PRINT.LEVELS
    if (options.calculateLevelsUpTo !== undefined) CALCULATE_PADDING_AT_LEVELS = range(0, options.calculateLevelsUpTo + 1)
    if (options.calculateLevelsFrom !== undefined) CALCULATE_PADDING_AT_LEVELS = range(options.calculateLevelsFrom, MAX_LEVEL_ROOT)

    const PADDING_COLUMN = range(0, SOURCE_TEXT.length).map(index => {
      return {
        BEFORE: ``,
        AFTER: ``,
      }
    })
    function padBefore(index: number) {
      if (PADDING_COLUMN[index] === undefined) debugger
      PADDING_COLUMN[index].BEFORE = CHARACTERS.WHITESPACE
      if (index > 1) PADDING_COLUMN[index - 1].AFTER = CHARACTERS.WHITESPACE
    }
    function padAfter(index: number) {
      PADDING_COLUMN[index].AFTER = CHARACTERS.WHITESPACE
      if (index < SOURCE_TEXT.length - 1) PADDING_COLUMN[index + 1].BEFORE = CHARACTERS.WHITESPACE
    }
    function padBoth(index: number) {
      padBefore(index)
      padAfter(index)
    }
    for (let level = 0; level < MAX_LEVEL_ROOT; level++) {
      if (!CALCULATE_PADDING_AT_LEVELS.includes(level)) continue

      for (const node of ROOT_LEVELS[level]) {
        if (node.syntax.type === `enclosure`) {
          padBoth(node.start)
          padBoth(node.end!)
        } else if (node.syntax.type === `separator`) {
          for (const middle of node.middles) padBoth(middle)
          if (node.syntax.name === `colon`) {
            padBefore(node.start)
            padAfter(node.end!)
          }
        } else if (node.syntax.type === `aggregator` && node.syntax.name !== `math_function` && node.syntax.name !== `directive`) {
          const _ranges = ranges(node.middles)
          for (const range of _ranges) {
            padBefore(range[0])
            padAfter(range[1])
          }
        } else if (node.syntax.type === `nil`) {
          padAfter(node.start)
        }
      }
    }

    // #endregion

    const PADDING = {
      LEVEL: foreshadowing_PADDING_LEVEL,
      COLUMN: PADDING_COLUMN,
    }

    const SIZE = {
      //
      LINE_MAX: LINE_SIZE,
      LINE_LEVEL_PADDED: LINE_SIZE - PADDING.LEVEL,
      //
      SOURCE_TEXT: SOURCE_TEXT.length,
    }

    this.SETUP = {
      log,
      //
      SOURCE_TEXT,
      NODES: LEVELS,
      MAX_LEVEL,
      MAX_LEVEL_ROOT,
      //
      CHARACTERS,
      COLORS,
      PRINT,
      SIZE,
      PADDING,
    }

    return this.SETUP
  }

  _print() {
    const { log, MAX_LEVEL, SIZE, PADDING, CHARACTERS, PRINT, NODES } = this.SETUP

    if (PRINT.CONTEXT) this._context(this.node)
    if (PRINT.HEADER) this._header()

    for (let i = 0; i < MAX_LEVEL; i++) {
      const level = this.node.level + i
      if (!PRINT.LEVELS.includes(level)) continue

      this._level(i)
    }
  }

  _context(node: INode) {
    const { log, PADDING, CHARACTERS } = this.SETUP

    const context = node.context.toString()
    // a padded strip spanning the whole possible line
    const paddedText = this._substring(this.start, this.end! + 1, () => CHARACTERS.WHITESPACE).split(``)

    const padding = paddedText.length - context.length
    const offsetStart = Math.ceil(padding / 2)

    paddedText.splice(offsetStart, context.length, `+`)
    const [padStart, padEnd] = paddedText.join(``).split(`+`)

    log.add(` `).debug()
    log
      .add(` `.repeat(PADDING.LEVEL))
      .add(node.backgroundColor.bold(`${padStart}${context}${padEnd}`))
      .debug()
    log.add(` `).debug()
  }

  _header() {
    const { log, MAX_LEVEL, SIZE, PADDING, CHARACTERS, PRINT, NODES } = this.SETUP

    // COLUMN NUMBERS
    const MAX_DIGITS = SIZE.SOURCE_TEXT.toString().length
    for (let d = 0; d < MAX_DIGITS; d++) {
      const e = MAX_DIGITS - d - 1 // exponent (i.e. d = 0 <=> e = 2 for 100)
      const e10 = Math.pow(10, e) // 10^e, 10^2 === 100

      let line = [] as string[]

      let overflow = 0
      // for each "column" in source text
      for (const column of range(...PRINT.SOURCE)) {
        const columnString = column.toString()
        const numberOfDigits = columnString.length

        let text = ``
        let color = identity as any as chalk.Chalk

        let tens = Math.floor(parseInt(columnString.substring(numberOfDigits - 2)) / 10)
        if (tens % 2 === 0) color = chalk.cyan
        else color = chalk.green

        if (e === 0) text = last([...columnString])!
        else {
          if (column % e10 === 0) {
            text = columnString

            if (numberOfDigits > 1) overflow = numberOfDigits
          } else text = overflow-- > 1 ? `` : ` `
        }

        const paddedText = this._substring(column, column + 1, () => text.toString())
        line.push(color(paddedText))
      }

      // print capped and prefixed lines
      this._A(-1, chalk.grey(line.join(``)), {
        printLineNumberAsLevel: true,
        alternatingLevelColor: [chalk.red.bold, chalk.magenta.bold],
        onlyFirstLine: PRINT.UNIQ_DIGITS && e === 0,
      })
    }

    // SOURCE TEXT
    const paddedSourceText = this._substring(this.start, this.end! + 1) // whole line

    // print capped and prefixed lines
    this._A(-1, paddedSourceText, {
      printLineNumberAsLevel: true,
      alternatingLevelColor: [chalk.red.bold, chalk.magenta.bold],
    })
  }

  /**
   * Print level in relation to node
   */
  _level(level: number) {
    const { PRINT } = this.SETUP

    if (PRINT.PARENT_NODES) {
      // this.printLevelNodes(log, level - 2, { printLevel: true })
      // this.printLevelNodes(log, level - 1, { printLevel: true })
    }

    if (PRINT.TEXT) this._text(level, { printLevel: true })
    if (PRINT.NODES) this._nodes(level, { printLevel: false })
  }

  _text(level: number, options: Partial<{ printLevel: boolean }> = {}) {
    const { NODES, PADDING, SIZE, CHARACTERS, COLORS } = this.SETUP

    const components = this._components(NODES[level])

    // parse nodes into colored substring
    const text = [] as string[]
    for (const component of components) {
      if (isString(component)) {
        text.push(component)
        continue
      }

      // if it is a node
      text.push(this._node_text(component))
    }

    // print capped and prefixed lines
    this._A(level, chalk.grey(text.join(``)), options)
  }

  _nodes(level: number, options: Partial<{ printLevel: boolean }> = {}) {
    const { NODES, PADDING, SIZE, CHARACTERS, COLORS } = this.SETUP

    // a component is a string (be whitespace or excerpt of source text) OR a node
    const components = this._components(NODES[level])

    // construct line from nodes in level
    const text = [] as (string | { text: string; overflow: number })[]
    for (const component of components) {
      if (isString(component)) {
        text.push(component)
        continue
      }

      text.push(...this._node_nodes(component))
    }

    // aggregate whitespaces
    let aggregateWhitespaceText = [] as (string | { text: string; overflow: number })[]
    for (let i = 0; i < text.length; i++) {
      const component = text[i]
      if (isString(component)) {
        const lastInAggregate = last(aggregateWhitespaceText) ?? `a`
        if (isString(lastInAggregate)) {
          if (!/\S/.test(lastInAggregate) && !/\S/.test(component)) {
            aggregateWhitespaceText[aggregateWhitespaceText.length - 1] = `${lastInAggregate}${component}`

            continue
          }
        }
      }

      aggregateWhitespaceText.push(component)
    }

    // remove overflow from sides (if they are whitespacess)
    const overflowAccountextText = cloneDeep(aggregateWhitespaceText)
    for (let i = 0; i < overflowAccountextText.length; i++) {
      if (isString(overflowAccountextText[i])) continue

      const overflownText = overflowAccountextText[i] as { text: string; overflow: number }
      if (overflownText.overflow === 0) {
        overflowAccountextText[i] = overflownText.text
        continue
      }

      const isOverflownTextWhitespaces = (index: number) => isString(overflowAccountextText[index]) && !/\S/.test(overflowAccountextText[index] as any)

      let remainingOverflow = overflownText.overflow
      overflowAccountextText[i] = overflownText.text

      const targetsInOrderOfPreference = [i + 1, i - 1]
      const validTargets = targetsInOrderOfPreference.filter(index => index >= 0 && index < overflowAccountextText.length && isOverflownTextWhitespaces(index))

      let halfOverflow = Math.ceil(remainingOverflow / 2)
      for (let j = 0; j < validTargets.length; j++) {
        const target = validTargets[j]

        const targetOverflowText = overflowAccountextText[target] as string
        const numberOfCharactersToRemove = Math.min(halfOverflow, targetOverflowText.length, remainingOverflow)
        overflowAccountextText[target] = targetOverflowText.substring(numberOfCharactersToRemove)

        remainingOverflow -= numberOfCharactersToRemove
      }

      // if (remainingOverflow > 0) debugger
    }

    this._A(level, chalk.grey(overflowAccountextText.join(``)), options)
  }

  _node_text(node: INode) {
    const { NODES, PADDING, SIZE, CHARACTERS, COLORS } = this.SETUP

    const substring = [] as string[]

    let colorSource = node
    if (COLORS.FILL.USE_PARENT_COLOR && node.parent) colorSource = node.parent
    let color = colorSource.color

    // color
    if (node.syntax.type === `string`) {
      if (COLORS.TEXT.SYNTAX.STRING.BOLD) color = color.bold
    } else if (node.syntax.name === `math_expression`) color = color.dim

    // assemble substring
    if (node.syntax.type === `enclosure`) {
      // by default only color outers of enclosure
      let outerColor = color
      let innerColor = identity as any as chalk.Chalk

      if (COLORS.TEXT.SYNTAX.ENCLOSURE.INNER_ONLY) {
        outerColor = identity as any as chalk.Chalk
        innerColor = color
      }

      const outer0 = this._substring(node.start, node.start + 1)
      const inner = this._substring(node.start + 1, node.end!)
      const outer1 = this._substring(node.end!, node.end! + 1)

      substring.push(outerColor(outer0))
      substring.push(innerColor(inner))
      substring.push(outerColor(outer1))
    } else if (node.syntax.name === `math_function` || node.syntax.name === `directive`) {
      const middle = node.middles[0] + 1

      const marker = node.children[0]

      const paddedMarker = this._substring(marker.start, marker.end! + 1)
      const paddedName = this._substring(marker.end! + 1, middle)
      const paddedOpen = this._substring(middle, middle + 1)
      const paddedArgs = this._substring(middle + 1, node.end!)
      const paddedClose = this._substring(node.end!, node.end! + 1)

      substring.push(color.dim(paddedMarker))
      substring.push(color.bold(paddedName))
      substring.push(color.bold(paddedOpen))
      substring.push(color.dim(paddedArgs))
      substring.push(color.bold(paddedClose))
    } else if ([`gca5_gives`].includes(node.syntax.name)) {
      const pairMiddles = chunk(node.middles, 2)

      for (let i = 0; i < pairMiddles.length; i++) {
        const middle = pairMiddles[i]
        const previousMiddle = pairMiddles[i - 1] ?? [-1, node.start - 1]

        // since end is in the array we only need to add the before text and middle text
        const beforeText = this._substring(previousMiddle[1] + 1, middle[0])
        const middleText = this._substring(middle[0], middle[1] + 1)

        substring.push(beforeText)
        substring.push(color.bold(middleText))
        if (i === pairMiddles.length - 1 && middle[1] !== node.end!) {
          const afterText = this._substring(middle[1] + 1, node.end! + 1)
          substring.push(afterText)
        }
      }
    } else if (node.syntax.type === `separator` || node.syntax.type === `aggregator`) {
      // color middles alone
      const middlesAndEnd = [...node.middles, node.end! + 1]
      for (let i = 0; i < middlesAndEnd.length; i++) {
        const middle = middlesAndEnd[i]
        const previousMiddle = middlesAndEnd[i - 1] ?? node.start - 1

        // since end is in the array we only need to add the before text and middle text
        const beforeText = this._substring(previousMiddle + 1, middle)
        const middleText = this._substring(middle, middle + 1)

        substring.push(beforeText)
        if (i < middlesAndEnd.length - 1) substring.push(color.bold(middleText))
      }
    } else if (node.syntax.type === `list` && node.parent?.syntax.name === `colon`) {
      const before = node.children[0]
      const afters = node.children.slice(1)

      const paddedBefore = this._substring(before.start, before.end! + 1)
      const paddedMiddle = this._substring(before.end! + 1, afters[0].start)
      const paddedAfter = this._substring(afters[0].start, last(afters)!.end! + 1)

      substring.push(`${color.bold(paddedBefore)}${paddedMiddle}${color(paddedAfter)}`)
    } else if (node.syntax.type === `list`) {
      const paddedText = this._substring(node.start, node.end! + 1)

      substring.push(color.bgBlack(paddedText))
    } else if (node.syntax.type === `nil`) {
      const isFirstNilChild = node.parent!.children.find(child => child.syntax.name === `nil`)!.context === node.context
      const isLastNilChild = !isFirstNilChild && node.parent!.children.findLast(child => child.syntax.name === `nil`)!.context === node.context

      const paddedText = this._substring(node.start + (isLastNilChild ? 1 : 0), node.end! + 1)

      substring.push(paddedText)
    } else {
      const rawSubstring = node.substring
      if (rawSubstring.match(/^ +$/g)) {
        const paddedText = this._substring(node.start, node.end! + 1, () => node.backgroundColor.dim(CHARACTERS.WHITESPACE.repeat(rawSubstring.length)))

        substring.push(paddedText)
      } else {
        const paddedText = this._substring(node.start, node.end! + 1)

        substring.push(color(paddedText))
      }
    }

    return substring.join(``)
  }

  _node_nodes(node: INode) {
    const { NODES, PADDING, SIZE, CHARACTERS, COLORS } = this.SETUP
    const LOCAL_DASH = CHARACTERS.DASH

    const parts = [] as (string | { text: string; overflow: number })[]

    const isFirstNilChild = node.syntax.name === `nil` && node.parent!.children.find(child => child.syntax.name === `nil`)!.context === node.context
    const isLastNilChild = node.syntax.name === `nil` && node.parent!.children.findLast(child => child.syntax.name === `nil`)!.context === node.context
    const isMiddleNilChild = node.syntax.name === `nil` && !isFirstNilChild && !isLastNilChild

    // make strings
    let centerText = node.context.toString()

    // SPECIAL CASE: Strings can ditch the point, the prefix "x" and level in context (since i hardly will inspect/search for string nodes)
    if (node.syntax.type === `nil` || node.syntax.name === `marker`) centerText = node.syntax.prefix
    else if (node.syntax.type === `string` || node.syntax.name === `math_number`) centerText = node.id === `root` ? `root` : toName(node.id)
    else if (node.syntax.name === `math_variable` || node.syntax.name === `math_expression`) centerText = node.id === `root` ? `root` : `${node.syntax.prefix}${node.id}`

    let edges = [CHARACTERS.EDGES[0], CHARACTERS.EDGES[1]]
    let fill = centerText

    // colors
    let doDimRanges = false

    let edgeColor = chalk.white

    let fillColorSource = node
    if (COLORS.FILL.USE_PARENT_COLOR && node.parent) fillColorSource = node.parent
    let fillColor = fillColorSource.color

    //    syntax-based
    if (node.syntax.name.startsWith(`math_`)) fillColor = fillColorSource.backgroundColor
    if (node.syntax.name === `math_variable`) doDimRanges = true
    if (node.syntax.name === `directive`) fillColor = fillColor.underline

    //    dimming
    if (doDimRanges || COLORS.EDGES.DIM) edgeColor = edgeColor.dim
    if (doDimRanges || COLORS.FILL.DIM) fillColor = fillColor.dim

    //    bolding
    fillColor = fillColor.bold
    edgeColor = edgeColor.bold

    // coloring
    edges = edges.map(edge => edgeColor(edge))
    fill = fillColor(fill)

    // decide what prints
    //  before start padding (to align edge with first character of substring)
    parts.push(PADDING.COLUMN[node.start].BEFORE)

    let viewportStart = this._substring(0, node.start).length + PADDING.COLUMN[node.start].BEFORE.length
    let viewportEnd = this._substring(0, node.end!).length + PADDING.COLUMN[node.end!].BEFORE.length

    const availableSpace = viewportEnd - viewportStart + 1
    const overflowLength = availableSpace - centerText.length
    if (overflowLength < 0) {
      parts.push({ text: fill, overflow: Math.abs(overflowLength) })
    } else {
      let dashes = LOCAL_DASH.repeat(availableSpace).split(``)
      const offsetStart = Math.floor((availableSpace - centerText.length) / 2)

      dashes.splice(offsetStart, centerText.length, `.`)
      const [prefix, suffix] = dashes.join(``).split(`.`)

      let boundary = `${prefix}${fill}${suffix}`

      // +4 to account for edges AND at least one dash on each side
      const isThereSpaceForEdges = availableSpace >= centerText.length + 4 // boundary[0] === LOCAL_DASH && boundary[boundary.length - 1] === LOCAL_DASH
      if (isThereSpaceForEdges) {
        boundary = `${edges[0]}${boundary.substring(1, boundary.length - 1)}${edges[1]}`
      } else {
        boundary = boundary.replaceAll(LOCAL_DASH, CHARACTERS.WHITESPACE)
      }

      const _boundary = boundary.replace(ANSI, ``)

      parts.push(boundary)
    }

    return parts
  }

  // #endregion

  // #region fluffs

  compact(options: Partial<PrintOptions> = {}) {
    const hasNodes = options.sections === undefined || options.sections?.includes(`nodes`)

    if (hasNodes) this.print({ lineSizeWithoutLevenPadding: 220, ...options, levels: [2], calculateLevels: [2, 3], sections: [`nodes`], onlyRelevantSource: true })
    this.print({
      levels: [3],
      calculateLevels: [2, 3],
      lineSizeWithoutLevenPadding: 220,
      onlyRelevantSource: true,
      boldString: true,
      colorInnerOnlyEnclosure: true,
      useParentColor: true,
      dimNodes: true,
      ...options,
      sections: hasNodes ? [`text`, `nodes`] : [`text`],
    })
    if (hasNodes) this.print({ lineSizeWithoutLevenPadding: 220, ...options, levels: [4], calculateLevels: [2, 3], sections: [`nodes`], onlyRelevantSource: true, dimNodes: true })
  }

  relevant(options: Partial<PrintOptions> = {}) {
    this.print({
      ...options,
      // levels: [1, 2, 3],
      sections: uniq([`nodes`, `text`, ...(options.sections ?? [])]),
      onlyRelevantSource: true,
      calculateLevelsFrom: this.node.level + 1,
    })
  }

  compactRelevant(display: string, options: Partial<PrintOptions> = {}) {
    console.error(this.node.backgroundColor(`${` `.repeat(50)}${display}${` `.repeat(50)}`))
    this.relevant({ sections: [`header`, `context`], ...options })
  }

  // #endregion
}
