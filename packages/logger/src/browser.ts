import ILogger from "./interface"
import { LEVEL_COLOR, LEVEL_COLOR_BROWSER, LEVEL_PRIORITY, LOG_LEVELS, LogLevel } from "./level"
import Builder, { BuilderOptions } from "./builder"
import { formatTimestamp } from "./utils"

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

    const levelColor = LEVEL_COLOR_BROWSER[level]

    const namePadding = Math.max(...LOG_LEVELS.map(level => level.length))

    const prefixText = [`[${this.name}]`, `${level.toLocaleUpperCase().padEnd(namePadding + 0)}`]
    const prefixStyles = [`color: darkgray;`, `font-weight: bold; color: ${levelColor}`]

    return { text: prefixText, style: prefixStyles }
  }

  log(level: LogLevel, ...message: string[]) {
    console[this._level(level)](...message)
  }

  logWithStyles(level: LogLevel, texts: string[], styles: string[]) {
    const consoleLevel = ({
      data: `debug`, // replacing http for npm
      verbose: `debug`,
      silly: `debug`,
    }[level as string] ?? level) as `error` | `warn` | `info` | `debug`

    const prefix = this._prefix(level)

    const _text = [...prefix.text, ...texts]
    const _styles = [...prefix.style, ...styles]

    const pText = _text.map(text => `%c${text}`).join(` `)

    let logTab = [`%c`, ``]
    if (consoleLevel !== `error` && consoleLevel !== `warn`) {
      logTab = [`%c `, `margin-left: 3.5px; background-color: transparent;`]
    }

    console[consoleLevel](logTab[0] + pText, ...[logTab[1], ..._styles])
  }
}
