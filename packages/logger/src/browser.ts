import ILogger from "./interface"
import { LEVEL_COLOR, LEVEL_COLOR_BROWSER, LEVEL_PRIORITY, LOG_LEVELS, LogLevel } from "./level"
import Builder, { BuilderOptions } from "./builder"
import { formatTimestamp } from "./utils"
import { set } from "lodash"

export default class BrowserLogger implements ILogger {
  name: string
  level: LogLevel

  constructor(name: string, level: LogLevel, config = {}) {
    this.name = name
    this.level = level
  }

  child(name: string, level?: LogLevel): ILogger {
    return new BrowserLogger(`${this.name}/${name}`, level ?? this.level)
  }

  builder(options: Partial<BuilderOptions> = {}): Builder {
    return new Builder(this, { ...options, isBrowser: true, noTimestamp: true })
  }

  _level(level: LogLevel) {
    const consoleLevel = ({
      data: `debug`, // replacing http for npm
      verbose: `debug`,
      silly: `debug`,
    }[level as string] ?? level) as `error` | `warn` | `info` | `debug`

    return consoleLevel
  }

  _prefix(level: LogLevel) {
    const timestamp = new Date()
    const formattedTimestamp = formatTimestamp(timestamp, `nice`)

    // const prefixText = [`[${formattedTimestamp}]`, `[${this.name}]`, `${level.toLocaleUpperCase()}`]
    // const prefixStyles = [`color: gray`, ``, `color: ${LEVEL_COLOR[level]}`]

    // FIXME: Structure this max name auto padder better, so far it is working ok
    // @ts-ignore
    if (window.__DECEMBER_LOGGER?.MAX_NAME_LENGTH === undefined) set(window, `__DECEMBER_LOGGER.MAX_NAME_LENGTH`, 0)

    // @ts-ignore
    if (this.name.length > window.__DECEMBER_LOGGER.MAX_NAME_LENGTH) set(window, `__DECEMBER_LOGGER.MAX_NAME_LENGTH`, this.name.length)

    // @ts-ignore
    const namePadding = window.__DECEMBER_LOGGER.MAX_NAME_LENGTH

    const levelColor = LEVEL_COLOR_BROWSER[level]

    const levelPadding = Math.max(...LOG_LEVELS.map(level => level.length))

    const prefixText = [`[${this.name}] `.padEnd(namePadding + 3), `${level.toLocaleUpperCase().padEnd(levelPadding + 0)} `]
    const prefixStyles = [`color: darkgray;`, `font-weight: bold; color: ${levelColor}`]

    return { text: prefixText, style: prefixStyles }
  }

  log(level: LogLevel, ...message: string[]) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return

    console[this._level(level)](...message)
  }

  logWithStyles(level: LogLevel, texts: string[], styles: string[]) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return

    const consoleLevel = this._level(level)

    const prefix = this._prefix(level)

    const _text = [...prefix.text, ...texts]
    const _styles = [...prefix.style, ...styles]

    const pText = _text.map(text => `%c${text}`).join(``)

    let logTab = [`%c`, ``]
    if (consoleLevel !== `error` && consoleLevel !== `warn`) {
      logTab = [`%c  `, `margin-left: 1px; background-color: transparent;`]
    }

    console[consoleLevel](logTab[0] + pText, ...[logTab[1], ..._styles])
  }

  logObjects(level: LogLevel, objects: any[]) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return

    const consoleLevel = this._level(level)

    const { text: prefix } = this._prefix(level)
    const _prefix = prefix.join(``)

    console[consoleLevel](`  ` + _prefix.slice(0, -2), ...objects)
  }
}
