/* eslint-disable no-debugger */
import ILogger from "../interface"
import paint, { Paint } from "../paint"
import { LogLevel } from "../level"

import Block, { DURATION_BLOCK, PAD_FROZEN_BLOCK } from "./block"
import Profiler from "./profiler"
import { isNil, isNilOrEmpty, isString } from "../utils"
import { difference, identity, intersection, isBoolean, isNumber, range, reverse } from "lodash"
import { typing } from "@december/utils"
import { isPrimitive } from "../../../utils/src/typing"
import { ChalkFunction } from "chalk"

export const BREAK_LINE = Symbol.for(`__DECEMBER_LOGGER_BREAK_LINE`)
export const BLOCK_SYMBOLS = [BREAK_LINE] as const

export type BuilderOptions = {
  isBrowser: boolean
  noTimestamp: boolean
  colorize: boolean
  separator: string
  tab: {
    size: number
    character: string
  }
}

export type TableOptions = {
  gapSize: number
  skip: (row: unknown[]) => boolean
}

export default class Builder {
  logger: ILogger

  options!: BuilderOptions

  lastTimestamp: number = 0

  profilers: { [name: string]: Profiler } = {}
  frozenBlocks: Block[] = []
  blocks: Block[] = []
  // styles: ValidStyle[] = [] // TODO: There should be "global" styles for builder?

  // SPECIAL SHIT
  _prefix: {
    blocks: Block[]
    styles: Paint[]
  }

  get BREAK_LINE() {
    return BREAK_LINE
  }

  constructor(logger: ILogger, options?: Partial<BuilderOptions>) {
    this.logger = logger

    this.lastTimestamp = Date.now()
    this.options = this.getDefaultOptions(options)

    this._prefix = { blocks: [], styles: [] }
  }

  child(name: string, level?: LogLevel, options?: Partial<BuilderOptions>): Builder {
    return this.logger.child(name, level).builder(options)
  }

  clone(frozeBlocks = false) {
    const clone = new Builder(this.logger, this.options)

    clone.profilers = {} // profilers are not kept
    clone.frozenBlocks = [...this.frozenBlocks.map(block => block._clone())]

    if (!frozeBlocks) clone.blocks = this.blocks.map(block => block._clone())
    else clone.frozenBlocks.push(...this.blocks.map(block => block._clone()))

    if (frozeBlocks) this.cleanAfterLog()

    clone._prefix.blocks.push(...this._prefix.blocks)
    clone._prefix.styles.push(...this._prefix.styles)

    return clone
  }

  /** replace all characters by whitespaces */
  whitespace() {
    const oldBlocks = [...this.blocks]

    this.blocks = []
    for (const block of oldBlocks) {
      const length = String(block._data).length

      const newBlock = this.createBlock(length === 0 ? `` : ` `.repeat(length))
      this.addBlock(newBlock)
    }

    return this
  }

  /** add prefix (specially rendered text at the start of every log) */
  prefix(...blocksOrStyles: (Block | Paint | unknown)[]) {
    for (const blockOrStyle of blocksOrStyles) {
      if ((blockOrStyle as Paint).isPaint) this._prefix.styles.push(blockOrStyle as Paint)
      else {
        const block = this._block(blockOrStyle)
        this._prefix.blocks.push(block)
      }
    }

    return this
  }

  fn(callback: (builder: Builder) => (...args: any[]) => void) {
    return callback(this)
  }

  // #region OPTIONS

  getDefaultOptions(options: Partial<BuilderOptions> = {}): BuilderOptions {
    return {
      isBrowser: options.isBrowser ?? false,
      noTimestamp: options.noTimestamp ?? false,
      colorize: options.colorize ?? true,
      separator: options.separator ?? ` `,
      tab: {
        size: options.tab?.size ?? 0,
        character: options.tab?.character ?? `  `,
      },
    }
  }

  tab(size?: number): this {
    if (size === undefined) size = +1

    this.options.tab.size += size

    // protect against negative tab size
    if (this.options.tab.size < 0) this.options.tab.size = 0

    return this
  }

  untab(size?: number): this {
    return this.tab(size === undefined ? -1 : -size)
  }

  setTab(size: number): this {
    this.options.tab.size = size

    // protect against negative tab size
    if (this.options.tab.size < 0) this.options.tab.size = 0

    return this
  }

  get t() {
    return this.tab()
  }

  // #endregion

  // #region BLOCKS

  createBlock(data: unknown, style?: string[]) {
    return new Block(data, style)
  }

  addBlock(block: Block): this {
    this.blocks.push(block)
    return this
  }

  _block(unknown: Block | string | number | unknown, style?: string[]) {
    let block: Block
    if (unknown instanceof Block) {
      block = unknown as Block

      // doing this to keep original argument immutable
      if (style && style.length > 0) {
        block = block._clone()
        block._style = [...block._style, ...style]
      }
    } else block = this.createBlock(unknown, style)

    return block
  }

  add(...args: unknown[]): this
  add(...blocks: (Block | string | number)[]): this
  add(...args: (Block | unknown)[]) {
    let style = undefined as string[] | undefined

    for (const unknown of args) {
      const block = this._block(unknown, style)
      this.addBlock(block)
    }

    return this
  }

  space(length: number, character = ` `): this {
    this.add(character.repeat(length))

    return this
  }

  get p() {
    return this.space(1, this.options.tab.character)
  }

  /** Transforms frozend blocks into padding */
  pad(character = ` `) {
    const pad = this.createBlock(character)
    pad._flags.push(PAD_FROZEN_BLOCK)

    return this.addBlock(pad)
  }

  table(table: (unknown[] | symbol)[], styles: (Paint | undefined)[] = [], options: Partial<TableOptions> = {}) {
    const firstValidRow = table.find(row => row !== BREAK_LINE) as unknown[]
    if (!firstValidRow) debugger

    const COLUMNS = firstValidRow.length
    const ROWS = table.length

    const GAP_SIZE = options.gapSize ?? 2

    const skipRow = options.skip ?? false

    // if no styles are provided, use default
    const _styles = (styles.length === COLUMNS ? styles : range(0, COLUMNS).map(i => styles[i] ?? undefined)).map(style => (style === undefined ? paint.identity : style))

    const tableLogger = this.clone(true)

    const columnPaddings = [] as number[]
    // calculate paddings
    for (let i = 0; i < ROWS; i++) {
      const row = table[i] as unknown[]

      if ((row as any) === BREAK_LINE) continue
      if (skipRow && skipRow(row)) continue

      for (let j = 0; j < COLUMNS; j++) {
        let cell = row[j]
        while (cell instanceof Block) cell = cell._data

        let text: string
        if (!isPrimitive(cell)) text = ` `.repeat(20)
        else text = String(cell)

        if (text.length > (columnPaddings[j] ?? 0)) columnPaddings[j] = text.length
      }
    }

    // print table
    for (let i = 0; i < ROWS; i++) {
      const row = table[i] as unknown[]

      const isSymbol = BLOCK_SYMBOLS.includes(row as any)
      if (isSymbol) {
        const symbol = row as any as symbol

        if (symbol === BREAK_LINE) tableLogger.add(` `).info()

        continue
      } else if (skipRow && skipRow(row)) continue

      for (let j = 0; j < COLUMNS; j++) {
        const cell = row[j]
        const style = _styles[j]

        // if (!isPrimitive(cell)) debugger
        const padding = columnPaddings[j] - String(cell).length + GAP_SIZE

        tableLogger.add(style(cell))

        if (j === COLUMNS - 1) continue
        if (padding > 0) tableLogger.space(padding, ` `)
      }

      tableLogger.info()
    }

    // logger.pad().add(paint.italic.grey(`context`)).p.add(context).info()
    // logger.pad().add(paint.italic.grey(`state`)).p.add(this._state).info()
    // logger.pad().add(paint.italic.grey(`element`)).p.add(this.element).info()
    // logger.pad().add(paint.italic.grey(`_element`)).p.add(this._element).info()

    // clean up
    this.cleanAfterLog()

    return this
  }

  // #endregion

  // #region PROFILERS

  // adds a flagged block to builder informing to render some profiler (or simply elapsed time)
  duration(profiler: string | Profiler): this {
    const name = isNil(profiler) ? null : isString(profiler) ? profiler : profiler.name

    // null means elapsed time
    const duration = this.createBlock(name)
    duration._flags.push(DURATION_BLOCK)

    return this.addBlock(duration)
  }

  timer(): Profiler
  timer(name: string): this
  timer(name?: string): this | Profiler {
    const profiler = new Profiler(this, name)
    this.profilers[profiler.name] = profiler

    if (name === undefined) return profiler

    return this
  }

  profiler(name: string) {
    return this.profilers[name]
  }

  // #endregion

  // #region GROUPS

  group(collapsed?: boolean): this {
    this.logger.group(collapsed)
    return this
  }

  openGroup(collapsed?: boolean): this {
    this.logger.openGroup(collapsed)

    return this
  }

  closeGroup(): this {
    this.logger.closeGroup()
    return this
  }

  // #endregion

  postProcessedBlocks() {
    const blocks = [] as Block[]

    const IMPLEMENTED_FLAGS = [DURATION_BLOCK, PAD_FROZEN_BLOCK] as const
    const _blocks = [...this.frozenBlocks, ...this.blocks]

    // detect flags
    const durationSuffixes = _blocks.filter(block => block._flags.includes(DURATION_BLOCK))
    const frozenBlocksAsPadding = _blocks.some(block => block._flags.includes(PAD_FROZEN_BLOCK))

    // prepare prefixes for injection
    const prefixStyles = this._prefix.styles.length > 0 ? reverse(this._prefix.styles) : []
    const prefixBlocks = [] as Block[]
    for (const block of this._prefix.blocks) {
      prefixBlocks.push(prefixStyles.reduce((block, style) => style(block), block))
    }

    if (prefixBlocks.length > 0) {
      prefixBlocks.unshift(prefixStyles.reduce((block, style) => style(block), this.createBlock(`[`)))
      prefixBlocks.push(prefixStyles.reduce((block, style) => style(block), this.createBlock(`] `)))
    }

    // inject frozen blocks
    for (const block of this.frozenBlocks) {
      const unimplementedFlags = difference(block._flags, IMPLEMENTED_FLAGS) // all flags that are yet to be implemented

      // if the block has flags, all all of them are implemented just skip its printing
      if (unimplementedFlags.length === 0 && block._flags.length > 0) continue

      if (frozenBlocksAsPadding) {
        const clone = block._clone()
        clone.addStyle(`post:opacity: 0.1`)

        blocks.push(clone)

        // // ERROR: How to pad non primitive values?
        // if (!typing.isPrimitive(block._data)) debugger

        // const text = String(block._data)

        // blocks.push(new Block(` `.repeat(text.length)))
        continue
      }

      blocks.push(block)
    }

    // inject ephemeral blocks
    for (const block of this.blocks) {
      const unimplementedFlags = difference(block._flags, IMPLEMENTED_FLAGS) // all flags that are yet to be implemented

      // if the block has flags, all all of them are implemented just skip its printing
      if (unimplementedFlags.length === 0 && block._flags.length > 0) continue

      blocks.push(block)
    }

    // inject suffixes
    for (const block of durationSuffixes) {
      // DURATION_BLOCK

      const profiler = this.profiler(block._data as string)!
      // eslint-disable-next-line no-debugger
      if (!profiler) debugger

      const duration = profiler.stop()
      profiler.destroy()

      let color: Paint = paint.green

      if (duration > 10000) color = paint.red.bold
      else if (duration > 2000) color = paint.hex(`#FF8800`).bold
      else if (duration > 1000) color = paint.yellow
      else if (duration > 100) color = paint.blue

      color = color.italic

      const sign = duration < 0 ? `-` : `+`
      blocks.push(color(` ${sign}${Math.abs(duration)}ms`))
    }

    // ONLY inject prefixes if there is something to print
    if (blocks.length > 0) blocks.unshift(...prefixBlocks)

    return blocks
  }

  _buildBlock(target: `browser` | `terminal`, block: Block) {
    const { data, styles } = block._buildForTarget(target, { ignoreStyle: !this.options.colorize, noTimestamp: this.options.noTimestamp })

    // ignore empty shit
    if ((isNil(data) || (isString(data) && isNilOrEmpty(data) && isNilOrEmpty(this.options.separator))) && isNilOrEmpty(styles)) return null

    return { data, styles }
  }

  // build blocks for
  build(target: `browser` | `terminal`) {
    const blocks = this.postProcessedBlocks()

    const objects = [] as any[]
    const styles = [] as (string | ChalkFunction)[][]

    const blocksClusters = [blocks]
    for (const blocks of blocksClusters) {
      for (const block of blocks) {
        const builtBlock = this._buildBlock(target, block)
        if (builtBlock) {
          objects.push(builtBlock.data)
          styles.push(builtBlock.styles ?? [])
        }
      }
    }

    return [objects, styles] as [any[], (string | ChalkFunction)[][]]
  }

  buildForBrowser() {
    const blocks = this.postProcessedBlocks()

    const objects = [] as any[]
    // const string = [] as string[]
    const css = [] as string[]
    for (const block of blocks) {
      const { data, style } = block._buildForBrowser({ ignoreStyle: !this.options.colorize, noTimestamp: this.options.noTimestamp })

      // if (data) objects.push(data)

      if ((isNil(data) || (isString(data) && isNilOrEmpty(data))) && isNilOrEmpty(style)) continue

      objects.push(data)
      css.push(style ?? ``)
    }

    return [objects, css] //, logObjects]
  }

  buildForTerminal() {
    const blocks = this.postProcessedBlocks()

    const text = blocks.map(block => block._buildForTerminal({ ignoreStyle: !this.options.colorize }))

    return text.join(this.options.separator)
  }

  // #region PROXY

  cleanAfterLog() {
    this.blocks = []
  }

  clearPrefix() {
    this._prefix = { blocks: [], styles: [] }
  }

  log(level: LogLevel): this {
    this.lastTimestamp = Date.now()

    // inject tab
    const tab = this.options.tab.size === 0 ? `` : this.options.tab.character.repeat(this.options.tab.size)

    const [objects, styles] = this.build(this.options.isBrowser ? `browser` : `terminal`)

    objects.splice(0, 0, tab)
    styles.splice(0, 0, [])

    this.logger.log(level, objects, styles, { separator: this.options.separator })

    // if (objects.length > 0) this.logger.logObjects(level, objects)

    // if (this.options.isBrowser) {
    //   const [objects, style] = this.buildForBrowser()

    //   objects.splice(0, 0, tab)
    //   style.splice(0, 0, ``)

    //   // this.logger.logWithStyles(level, objects, style)

    //   // if (objects.length > 0) this.logger.logObjects(level, objects)
    // } else {
    //   let message = this.buildForTerminal()

    //   message = `${tab}${message}`

    //   this.logger.log(level, message)
    // }

    this.cleanAfterLog()

    return this
  }

  // for cli and npm levels
  error() {
    return this.log(`error`)
  }
  warn() {
    return this.log(`warn`)
  }
  info() {
    return this.log(`info`)
  }
  data() {
    return this.log(`data`)
  }
  verbose() {
    return this.log(`verbose`)
  }
  debug() {
    return this.log(`debug`)
  }
  silly() {
    return this.log(`silly`)
  }

  // #endregion
}
