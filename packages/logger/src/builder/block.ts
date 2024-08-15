import chalk, { ChalkFunction } from "chalk"
import { parseCSS } from "./css"
import { removeANSI } from "../utils"
import { cloneDeep, isBoolean, isNil, isNumber, isString } from "lodash"
import { colorNameToHex } from "../../../utils/src"

export const DURATION_BLOCK = Symbol.for(`__DECEMBER_LOGGER_DURATION_BLOCK`)
export const PAD_FROZEN_BLOCK = Symbol.for(`__DECEMBER_LOGGER_PAD_FROZEN_BLOCK`)

export const BLOCK_FLAGS = [DURATION_BLOCK, PAD_FROZEN_BLOCK] as const
export type BlockFlag = (typeof BLOCK_FLAGS)[number]

export type BlockBuildOptions = {
  style: string[]
  ignoreStyle: boolean
  isBrowser: boolean
  noTimestamp: boolean
}

export type Style = string | ChalkFunction

export default class Block {
  _data: unknown
  _style: string[] = []

  _flags: BlockFlag[] = []

  constructor(data: unknown, style?: string[]) {
    this._data = data
    this._style = style ?? []
  }

  get length() {
    return String(this._data).length
  }

  // #region INTERNALS

  _clone() {
    const clone = new Block(cloneDeep(this._data), [...this._style])

    clone._flags = [...this._flags]

    return clone
  }

  _buildForTarget(target: `browser` | `terminal`, options: Partial<BlockBuildOptions> = {}) {
    // if (target === `browser`) return this._buildForBrowser(options)
    // else return this._buildForTerminal(options)

    if (options.ignoreStyle) return { data: this._data }

    const allStyles = [...(options.style ?? []), ...this._style]
    const postProcessing = { opacity: undefined as number | undefined }

    let styles = [] as Style[]
    // parse all styles into string
    for (const _style of allStyles) {
      // "identity" is nothing really
      if (_style === `identity`) continue

      // reset/clear all styles
      if (_style === `ansi:reset`) {
        styles = []
        continue
      }

      // post processing style (applied after all the others)
      if (_style.startsWith(`post:`)) {
        // post processing css lines
        if (_style.startsWith(`post:opacity:`)) {
          const opacity = parseFloat(_style.slice(5 + 8).replaceAll(` `, ``))

          postProcessing.opacity = opacity
        } else {
          // ERROR: Unimplemented post processing style
          debugger
        }

        continue
      }

      if (target === `browser`) styles.push(parseCSS(_style))
      else if (target === `terminal`) {
        // "non-ansi" styles cannot be parsed by chalk
        if (!_style.startsWith(`ansi:`)) continue

        let ansiStyle = _style.slice(5)
        let chalkFunction: chalk.Chalk

        // TODO: Implement custom opacity
        if (postProcessing.opacity !== undefined) debugger

        if (_style.startsWith(`hex:`)) {
          const color = ansiStyle.slice(4)
          chalkFunction = chalk.hex(color)
        } else {
          chalkFunction = chalk[ansiStyle as keyof chalk.Chalk] as chalk.Chalk
        }

        if (chalkFunction) {
          // @ts-ignore
          chalkFunction._name = _style
          styles.push(chalkFunction)
        } else {
          // eslint-disable-next-line no-debugger
          debugger
          throw new Error(`Unknown ansi (chalk) style: ${ansiStyle}`)
        }
      } else {
        // ERROR: Unimplemented target
        debugger
      }
    }

    // apply post processing
    if (target === `browser` && postProcessing.opacity !== undefined) {
      // opacity post processing is applied as "post" only for browser

      // basically change color/background-color properties to rgba, adding the opacity value

      let hasColorRule = false
      for (let i = 0; i < styles.length; i++) {
        const rule = styles[i] as string

        const isColor = rule.trim().toLowerCase().startsWith(`color:`)
        const isBackgroundColor = rule.trim().toLowerCase().startsWith(`background-color:`)

        if (isColor || isBackgroundColor) {
          hasColorRule = true

          let color = rule.split(`:`)[1].trim()

          if (!color.includes(`#`)) {
            color = colorNameToHex(color)!
            if (color === undefined) debugger
          }

          if (color.includes(`#`)) {
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)

            styles[i] = `${isColor ? `color` : `background-color`}: rgba(${r}, ${g}, ${b}, ${postProcessing.opacity})`
          } else {
            debugger
          }
        }
      }

      // if no color rule is found, add one for black
      if (!hasColorRule) styles.push(`color: rgba(0, 0, 0, ${postProcessing.opacity})`)
    }

    return { data: this._data, styles }
  }

  _buildForBrowser(options: Partial<BlockBuildOptions> = {}) {
    // let type = `unknown`
    // if (isString(this._data) || isNumber(this._data) || isBoolean(this._data) || isNil(this._data)) type = `primitive`

    // if (type === `unknown`) return { data: this._data }

    // let text = String(this._data)

    if (!options.ignoreStyle) {
      const styles = [...(options.style ?? []), ...this._style]

      const postProcessing = { opacity: undefined as number | undefined }

      let css = [] as string[]
      for (const style of styles) {
        if (style === `ansi:reset` || style === `identity`) css = []
        else if (style.startsWith(`post:`)) {
          // post processing css lines
          const _style = style.slice(5)
          if (_style.startsWith(`opacity:`)) {
            const opacity = parseFloat(_style.slice(8).replaceAll(` `, ``))

            postProcessing.opacity = opacity
          } else {
            // ERROR: Unimplemented post processing
            debugger
          }
        } else css.push(parseCSS(style))
      }

      if (postProcessing.opacity !== undefined) {
        // basically change color/background-color properties to rgba, adding the opacity value

        let hasColorRule = false
        for (let i = 0; i < css.length; i++) {
          const rule = css[i]

          const isColor = rule.trim().toLowerCase().startsWith(`color:`)
          const isBackgroundColor = rule.trim().toLowerCase().startsWith(`background-color:`)

          if (isColor || isBackgroundColor) {
            hasColorRule = true

            let color = rule.split(`:`)[1].trim()

            if (!color.includes(`#`)) {
              color = colorNameToHex(color)!
              if (color === undefined) debugger
            }

            if (color.includes(`#`)) {
              const r = parseInt(color.slice(1, 3), 16)
              const g = parseInt(color.slice(3, 5), 16)
              const b = parseInt(color.slice(5, 7), 16)

              css[i] = `${isColor ? `color` : `background-color`}: rgba(${r}, ${g}, ${b}, ${postProcessing.opacity})`
            } else {
              debugger
            }
          }
        }

        // if no color rule is found, add one for black
        if (!hasColorRule) css.push(`color: rgba(0, 0, 0, ${postProcessing.opacity})`)
      }

      return { data: this._data, style: css.join(`; `) }
    }

    return { data: this._data }
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
