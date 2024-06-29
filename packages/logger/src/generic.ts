import ILogger, { GlobalLoggerContext, LoggerOptions } from "./interface"
import { LEVEL_COLOR, LEVEL_COLOR_BROWSER, LEVEL_PRIORITY, LOG_LEVELS, LogLevel } from "./level"
import Builder, { BuilderOptions } from "./builder"
import { formatTimestamp, isNilOrEmpty } from "./utils"
import { isNil, set } from "lodash"
import Block, { Style } from "./builder/block"

export default class GenericLogger implements ILogger {
  name: string
  level: LogLevel
  globalContext: string = `__DECEMBER_LOGGER`

  // _offspringPrototype: new (...args: any) => ILogger = GenericLogger

  get GLOBAL_CONTEXT(): GlobalLoggerContext {
    throw new Error(`GenericLogger doesn not implement initializeGlobalContext`)
    // const key = this.globalContext as keyof typeof window
    // return (window[key] || {}) as GlobalLoggerContext
  }

  initializeGlobalContext() {
    throw new Error(`GenericLogger doesn not implement initializeGlobalContext`)
    // const key = this.globalContext as keyof typeof window

    // if (window[key] !== undefined) return

    // const context: GlobalLoggerContext = {
    //   MAX_NAME_LENGTH: 0,
    //   OPEN_GROUPS: [],
    //   CLOSE_GROUPS: 0,
    // }

    // // @ts-ignore
    // window[key] = context
  }

  constructor(name: string, level: LogLevel) {
    this.name = name
    this.level = level

    this.initializeGlobalContext()
  }

  builder(options: Partial<BuilderOptions> = {}): Builder {
    return new Builder(this, { ...options, isBrowser: false, noTimestamp: false })
  }

  child(name: string, level?: LogLevel): ILogger {
    return new GenericLogger(`${this.name}/${name}`, level ?? this.level)
  }

  // #region Group Handling
  group(collapsed?: boolean) {
    const needsClosing = this.GLOBAL_CONTEXT.GROUPS > 0

    if (needsClosing) this.closeGroup()
    else this.openGroup(collapsed)
  }

  openGroup(collapsed?: boolean) {
    // just register a new group in stack
    this.GLOBAL_CONTEXT.OPEN_GROUPS.push({ collapsed: !!collapsed })
  }

  closeGroup(delay = false) {
    // a generic logger doesn't need to do anything here but stack closing "command" but update depth
    if (delay) this.GLOBAL_CONTEXT.CLOSE_GROUPS.push(-1) // close last group
    else this.GLOBAL_CONTEXT.GROUPS--
  }
  //#endregion

  // #region Print Handling

  _prefix_group(level: LogLevel) {
    // generic, so far, doesnt handle groups
    //    its something that should be handled by the specialization (console, browser)

    return {
      objects: [` `],
      styles: [[]] as Style[][],
    }
  }

  prefix(level: LogLevel) {
    // FIXME: Structure this max name auto padder better, so far it is working ok
    if (this.name.length > this.GLOBAL_CONTEXT.MAX_NAME_LENGTH) this.GLOBAL_CONTEXT.MAX_NAME_LENGTH = this.name.length

    const padding = {
      name: this.GLOBAL_CONTEXT.MAX_NAME_LENGTH,
      level: Math.max(...LOG_LEVELS.map(level => level.length)),
    }

    const NAME = `[${this.name}] `.padEnd(padding.name + 3)
    const LEVEL = `${level.toUpperCase().padEnd(padding.level + 0)} `

    const GROUP = this._prefix_group(level)

    return {
      objects: [NAME, LEVEL, ...GROUP.objects],
      styles: [[], [], ...GROUP.styles] as Style[][],
    }
  }

  _print_group_open(level: LogLevel, ...args: any[]) {
    // generic, so far, doesnt treat group printing any different

    return false
  }

  _print_group_close(level: LogLevel, ...args: any[]) {
    // generic, so far, doesnt treat group printing any different

    return false
  }

  _print(level: LogLevel, options: Partial<LoggerOptions>, ...args: any[]) {
    // generic print just prints shit
    let consoleLevel = ({
      data: `debug`, // replacing http for npm
      verbose: `debug`,
      silly: `debug`,
    }[level as string] ?? level) as `error` | `warn` | `info` | `debug`

    const openGroup = this.GLOBAL_CONTEXT.OPEN_GROUPS.pop()
    if (openGroup) {
      // register new open group
      this.GLOBAL_CONTEXT.GROUPS++

      // if print group handlers says so, prevent default print (probably group handler already printed)
      if (this._print_group_open(consoleLevel, ...args)) return
    }

    const closeGroup = this.GLOBAL_CONTEXT.CLOSE_GROUPS.pop()
    if (!isNil(closeGroup)) {
      // kill group
      this.GLOBAL_CONTEXT.GROUPS--

      // if print group handlers says so, prevent default print (probably group handler already printed)
      if (this._print_group_close(consoleLevel, ...args)) return
    }

    console[consoleLevel](...args)
  }

  print(level: LogLevel, objects: any[], styles: Style[][] = [], options: Partial<LoggerOptions> = {}) {
    // styles are ignored for generic loggers

    // "basic" generic implementation just adds prefix
    const prefix = this.prefix(level).objects

    this._print(level, options, ...prefix, ...objects)
  }

  canPrint(level: LogLevel) {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) return false

    return true
  }

  // just print blocks
  log(level: LogLevel, objects: any[], styles: Style[][] = [], options: Partial<LoggerOptions> = {}) {
    if (!this.canPrint(level)) return

    this.print(level, objects, styles, options)
  }

  // #endregion
}
