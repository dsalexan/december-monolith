import ILogger, { GlobalLoggerContext, LoggerOptions } from "./interface"
import { LEVEL_COLOR, LEVEL_COLOR_BROWSER, LEVEL_PRIORITY, LOG_LEVELS, LogLevel } from "./level"
import Builder, { BuilderOptions } from "./builder"
import { formatTimestamp, isNilOrEmpty } from "./utils"
import { extend, isNil, last, set } from "lodash"
import GenericLogger from "./generic"
import { Style } from "./builder/block"
import chalk, { ChalkFunction } from "chalk"

export default class ConsoleLogger extends GenericLogger {
  constructor(name: string, level: LogLevel) {
    super(name, level)
  }

  get GLOBAL_CONTEXT(): GlobalLoggerContext {
    const key = this.globalContext as keyof typeof global
    return (global[key] || {}) as GlobalLoggerContext
  }

  initializeGlobalContext() {
    const key = this.globalContext as keyof typeof global

    if (global[key] !== undefined) return

    const context: GlobalLoggerContext = {
      MAX_NAME_LENGTH: 0,
      OPEN_GROUPS: [],
      CLOSE_GROUPS: [],
      GROUPS: 0,
    }

    // @ts-ignore
    global[key] = context
  }

  child(name: string, level?: LogLevel) {
    return new ConsoleLogger(`${this.name}/${name}`, level ?? this.level)
  }

  prefix(level: LogLevel) {
    const { objects, styles } = super.prefix(level)

    styles[0] = [chalk.grey]
    // @ts-ignore
    styles[1] = [chalk.bold, chalk[LEVEL_COLOR[level]]]

    return { objects, styles }
  }

  print(level: LogLevel, objects: any[], styles: Style[][] = [], options: Partial<LoggerOptions> = {}) {
    const prefix = this.prefix(level)
    const OBJECTS = [...prefix.objects, ...objects]
    const STYLES = [...prefix.styles, ...styles] as ChalkFunction[][]

    // build final string message
    const string = [] as string[]
    for (let i = 0; i < OBJECTS.length; i++) {
      const object = OBJECTS[i]
      const style = STYLES[i]

      const raw = String(object)

      let styledString = raw
      for (const styleFunction of style) styledString = styleFunction ? styleFunction(styledString) : styledString

      let typeStyleOverridenString = styledString
      if (typeof object === `boolean`) {
        typeStyleOverridenString = chalk.green(styledString)
      } else if (typeof object === `number`) {
        typeStyleOverridenString = chalk.blue(styledString)
      }

      string.push(typeStyleOverridenString)
    }

    this._print(level, options, string.join(options.separator ?? ` `))
  }

  _prefix_group(level: LogLevel) {
    const objects = [] as any[]
    const styles = [] as Style[][]

    let DEPTH_1_TAB = ` `

    for (let depth = 0; depth < this.GLOBAL_CONTEXT.GROUPS; depth++) {
      objects.push(`${depth > 0 ? DEPTH_1_TAB : ``}|`)
      styles.push([chalk.grey])
    }

    // const closeGroup = last(this.GLOBAL_CONTEXT.CLOSE_GROUPS)
    // if (!isNil(closeGroup)) {
    //   // remove last "|"
    //   if (objects.length > 0) {
    //     objects.pop()
    //     styles.pop()
    //   }

    //   objects.push(`⨽`)
    //   styles.push([chalk.grey])
    // }

    const openGroup = last(this.GLOBAL_CONTEXT.OPEN_GROUPS) ?? false
    if (openGroup) {
      // collapsed groups are ignored in console

      objects.push(`${this.GLOBAL_CONTEXT.GROUPS > 0 ? DEPTH_1_TAB : ``}▼`)
      styles.push([chalk.grey])
    }

    if (objects.length > 0) return { objects: [`${objects[0]}`, ...objects.slice(1)], styles }

    return super._prefix_group(level)
  }
}
