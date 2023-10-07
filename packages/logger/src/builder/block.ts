import chalk from "chalk"
import { parseCSS } from "./css"
import { removeANSI } from "../utils"
import { isBoolean, isNil, isNumber, isString } from "lodash"

export const DURATION_BLOCK = Symbol.for(`__CHURCHILL_DURATION_BLOCK`)

export const BLOCK_FLAGS = [DURATION_BLOCK] as const
export type BlockFlag = (typeof BLOCK_FLAGS)[number]

export type BlockBuildOptions = {
  style: string[]
  ignoreStyle: boolean
  isBrowser: boolean
  noTimestamp: boolean
}

export default class Block {
  _data: unknown
  _style: string[] = []

  _flags: BlockFlag[] = []

  constructor(data: unknown, style?: string[]) {
    this._data = data
    this._style = style ?? []
  }

  // #region INTERNALS

  _clone() {
    const clone = new Block(this._data, this._style)

    return clone
  }

  _buildForBrowser(options: Partial<BlockBuildOptions> = {}) {
    let type = `unknown`
    if (isString(this._data) || isNumber(this._data) || isBoolean(this._data) || isNil(this._data)) type = `primitive`

    if (type === `unknown`) return { data: this._data }

    let text = String(this._data)

    if (!options.ignoreStyle) {
      const styles = [...(options.style ?? []), ...this._style]
      let css = [] as string[]
      for (const style of styles) {
        if (style === `ansi:reset`) css = []
        else css.push(parseCSS(style))
      }

      return { text, style: css.join(`; `) }
    }

    return { text }
  }

  _buildForTerminal(options: Partial<BlockBuildOptions> = {}) {
    let text = String(this._data)

    if (!options.ignoreStyle) {
      const styles = [...(options.style ?? []), ...this._style]

      for (const style of styles) {
        if (style === `ansi:reset`) text = removeANSI(text)
        else if (style.startsWith(`ansi:`)) {
          let _style = style.slice(5)

          let chalkFunction: chalk.Chalk

          if (_style.startsWith(`hex:`)) {
            const color = _style.slice(4)
            chalkFunction = chalk.hex(color)
          } else {
            chalkFunction = chalk[_style as keyof chalk.Chalk] as chalk.Chalk
          }

          if (chalkFunction) text = chalkFunction(text)
          else {
            // eslint-disable-next-line no-debugger
            debugger
            throw new Error(`Unknown chalk style: ${style}`)
          }
        } else {
          // "non-ansi" styles cannot be parsed by chalk
          // continue
        }
      }
    }

    return text
  }

  // #endregion

  addStyle(style: string) {
    this._style.push(style)
  }
}
