import ILogger from "./interface"
import { LEVEL_COLOR, LEVEL_PRIORITY, LogLevel } from "./level"
import Builder, { BuilderOptions } from "./builder"
import { format } from "date-fns"

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
    return new Builder(this, { ...options, isBrowser: true })
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
    const formattedTimestamp = format(timestamp, `yyyy/MM/dd HH:mm:ss`)

    const prefixText = [`[${formattedTimestamp}]`, `[${this.name}]`, `${level.toLocaleUpperCase()}`]
    const prefixStyles = [`color: gray`, ``, `color: ${LEVEL_COLOR[level]}`]

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

    console[consoleLevel](...prefix.text, ...texts, ...prefix.style, ...styles)
  }
}
