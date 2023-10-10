import ILogger from "./interface"
import { LEVEL_COLOR, LEVEL_COLOR_BROWSER, LEVEL_PRIORITY, LOG_LEVELS, LogLevel } from "./level"
import Builder, { BuilderOptions } from "./builder"
import { formatTimestamp, isNilOrEmpty } from "./utils"
import { set } from "lodash"

type GlobalDecemberLogger = {
  MAX_NAME_LENGTH: number
  OPEN_GROUPS: { collapsed: boolean }[]
  CLOSE_GROUPS: number
}

declare global {
  let __DECEMBER_LOGGER: GlobalDecemberLogger

  interface Window {
    __DECEMBER_LOGGER: GlobalDecemberLogger
  }
}

export default class BrowserLogger implements ILogger {
  name: string
  level: LogLevel

  constructor(name: string, level: LogLevel, config = {}) {
    this.name = name
    this.level = level

    if (window.__DECEMBER_LOGGER === undefined)
      window.__DECEMBER_LOGGER = {
        MAX_NAME_LENGTH: 0,
        OPEN_GROUPS: [],
        CLOSE_GROUPS: 0,
      }
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
    if (this.name.length > window.__DECEMBER_LOGGER.MAX_NAME_LENGTH) window.__DECEMBER_LOGGER.MAX_NAME_LENGTH = this.name.length

    const namePadding = window.__DECEMBER_LOGGER.MAX_NAME_LENGTH

    const levelColor = LEVEL_COLOR_BROWSER[level]

    const levelPadding = Math.max(...LOG_LEVELS.map(level => level.length))

    const prefixText = [`[${this.name}] `.padEnd(namePadding + 3), `${level.toLocaleUpperCase().padEnd(levelPadding + 0)} `]
    const prefixStyles = [`color: darkgray;`, `font-weight: bold; color: ${levelColor}`]

    return { text: prefixText, style: prefixStyles }
  }

  console(level: `error` | `warn` | `info` | `debug`, ...args: any) {
    const doGroup = window.__DECEMBER_LOGGER.OPEN_GROUPS.pop()

    // inject error/warn compensation
    if (level !== `error` && level !== `warn`) {
      args[0] = `%c` + (doGroup ? ` ` : `  `) + args[0]
      args.splice(1, 0, `margin-left: ${doGroup ? 4 : 1}px; background-color: transparent;`)
    }

    if (doGroup) {
      if (doGroup.collapsed) console.groupCollapsed(...args)
      else console.group(...args)

      window.__DECEMBER_LOGGER.CLOSE_GROUPS++

      return
    }

    console[level](...args)
  }

  log(level: LogLevel, ...message: string[]) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return

    this.console(this._level(level), ...message)
  }

  logWithStyles(level: LogLevel, objects: any[], styles: string[]) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return

    const consoleLevel = this._level(level)

    // inject prefix
    const prefix = this._prefix(level)
    const _objects = [...prefix.text, ...objects]
    const _styles = [...prefix.style, ...styles]

    // build format string and ordered args
    const formats = [] as string[]
    const args = [] as any[]
    for (let i = 0; i < _objects.length; i++) {
      const object = _objects[i]
      const style = _styles[i]

      if (typeof object === `string`) {
        args.push(style)
        formats.push(`%c`)

        args.push(object)
        formats.push(`%s`)
      } else if (typeof object === `boolean`) {
        args.push(`color: #007a00; font-weight: bold;`)
        formats.push(`%c`)

        args.push(object)
        formats.push(`%s`)
      } else if (typeof object === `number`) {
        args.push(`color: #1A1AA6`)
        formats.push(`%c`)

        args.push(object)
        if (object % 1 > 0) formats.push(`%f`)
        else formats.push(`%d`)
      } else {
        formats.push(`%O`)
        args.push(object)
      }
    }

    let formatString = ``
    for (const format of formats) formatString += format + (format === `%c` ? `` : ``)
    if (formatString[formatString.length - 1] === ` `) formatString = formatString.substring(0, formatString.length - 1)

    this.console(consoleLevel, formatString, ...args)
  }

  logObjects(level: LogLevel, objects: any[]) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return

    const consoleLevel = this._level(level)

    const { text: prefix } = this._prefix(level)
    const _prefix = prefix.join(``)

    this.console(consoleLevel, `  ` + _prefix.slice(0, -2), ...objects)
  }

  group(collapsed?: boolean) {
    const needsClosing = window.__DECEMBER_LOGGER.CLOSE_GROUPS > 0

    if (needsClosing) this.closeGroup()
    else this.openGroup(collapsed)
  }

  openGroup(collapsed?: boolean) {
    window.__DECEMBER_LOGGER.OPEN_GROUPS.push({ collapsed: !!collapsed })
  }

  closeGroup() {
    console.groupEnd()
    window.__DECEMBER_LOGGER.CLOSE_GROUPS--
  }
}
