import { isNilOrEmpty } from "@december/utils"

import ILogger from "../interface"
import paint, { Paint } from "../paint"
import { LogLevel } from "../level"

// import { isNil, isString } from "lodash"
import Block, { DURATION_BLOCK } from "./block"
import { Profiler } from "./profiler"

function isNil(value: any): value is null | undefined {
  return value === undefined || value === null
}

function isString(value: any): value is string {
  return typeof value === `string`
}

export type BuilderOptions = {
  isBrowser: boolean
  colorize: boolean
  separator: string
  tab: {
    size: number
    character: string
  }
}

export default class Builder {
  logger: ILogger

  options!: BuilderOptions

  lastTimestamp: number = 0

  profilers: { [name: string]: Profiler } = {}
  blocks: Block[] = []
  // styles: ValidStyle[] = [] // TODO: There should be "global" styles for builder?

  constructor(logger: ILogger, options?: Partial<BuilderOptions>) {
    this.logger = logger

    this.lastTimestamp = Date.now()
    this.options = this.getDefaultOptions(options)
  }

  clone() {
    const clone = new Builder(this.logger, this.options)

    clone.profilers = {} // profilers are not kept
    clone.blocks = this.blocks.map(block => block._clone())

    return clone
  }

  // #region OPTIONS

  getDefaultOptions(options: Partial<BuilderOptions> = {}): BuilderOptions {
    return {
      isBrowser: options.isBrowser ?? false,
      colorize: options.colorize ?? true,
      separator: options.separator ?? ` `,
      tab: {
        size: options.tab?.size ?? 2,
        character: options.tab?.character ?? ` `,
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

  setTab(size: number): this {
    this.options.tab.size = size

    // protect against negative tab size
    if (this.options.tab.size < 0) this.options.tab.size = 0

    return this
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

  add(...strings: string[]): this
  add(...blocks: (Block | string)[]): this
  add(...args: (Block | string)[]) {
    let style = undefined as string[] | undefined
    let block: Block

    for (const unknown of args) {
      if (unknown instanceof Block) {
        block = unknown as Block

        // doing this to keep original argument immutable
        if (style && style.length > 0) {
          block = block._clone()
          block._style = [...block._style, ...style]
        }
      } else block = this.createBlock(unknown, style)

      this.addBlock(block)
    }

    return this
  }

  space(length: number, character = ` `): this {
    this.add(character.repeat(length))

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

  postProcessedBlocks() {
    const blocks = [] as Block[]

    const suffixes = [] as Block[]
    for (const block of this.blocks) {
      if (block._flags.includes(DURATION_BLOCK)) {
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
        suffixes.push(color(`${sign}${Math.abs(duration)}ms`))

        continue
      }

      blocks.push(block)
    }

    return [...blocks, ...suffixes]
  }

  buildForBrowser() {
    const blocks = this.postProcessedBlocks()

    const string = [] as string[]
    const css = [] as string[]
    for (const block of blocks) {
      const { text, style } = block._buildForBrowser({ ignoreStyle: !this.options.colorize })

      if (isNilOrEmpty(text) && isNilOrEmpty(style)) continue

      string.push(text)
      css.push(style ?? ``)
    }

    return [string, css]
  }

  buildForTerminal() {
    const blocks = this.postProcessedBlocks()

    const text = blocks.map(block => block._buildForTerminal({ ignoreStyle: !this.options.colorize }))

    return text.join(this.options.separator)
  }

  // #region PROXY

  log(level: LogLevel): this {
    this.lastTimestamp = Date.now()

    if (this.options.isBrowser) {
      const [message, style] = this.buildForBrowser()

      this.logger.logWithStyles(level, message, style)
    } else {
      const message = this.buildForTerminal()

      this.logger.log(level, message)
    }

    this.blocks = []

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
