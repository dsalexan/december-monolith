import winston from "winston"

import ILogger from "./interface"
import { LEVEL_PRIORITY, LogLevel } from "./level"
import timestamp from "./formats/timestamp"
import simple from "./formats/simple"
import { getTimestamp } from "./utils"
import complex from "./formats/complex"
import Builder, { BuilderOptions } from "./builder"

export default class WinstonLogger implements ILogger {
  name: string
  level: LogLevel

  winston: winston.Logger

  store = {
    lastTimestamp: undefined as Date | undefined,
  }

  constructor(name: string, level: LogLevel, config = {}) {
    const creationTimestamp = getTimestamp()

    this.name = name
    this.level = level

    this.winston = winston.createLogger({
      levels: LEVEL_PRIORITY,
      level: `${level}`,
      transports: [
        new winston.transports.Console({
          level: `${level}`,
          format: winston.format.combine(
            winston.format.padLevels({ ...config, levels: LEVEL_PRIORITY }),
            timestamp({ store: this.store }),
            winston.format.splat(),
            winston.format.label({ label: name }),
            simple({ colorize: true }),
          ),
        }),

        // long-term
        new winston.transports.File({
          filename: `./logs/${name}/${creationTimestamp}_error.log`,
          level: `error`,
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
        }),
        new winston.transports.File({
          filename: `./logs/${name}/${creationTimestamp}_warn.log`,
          level: `warn`,
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
        }),
        new winston.transports.File({
          filename: `./logs/${name}/${creationTimestamp}_all.log`,
          level: `silly`,
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
        }),

        // short-term
        new winston.transports.File({
          filename: `./logs/${name}/${`latest`}_error.log`,
          level: `error`,
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
        }),
        new winston.transports.File({
          filename: `./logs/${name}/${`latest`}_warn.log`,
          level: `warn`,
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
        }),
        new winston.transports.File({
          filename: `./logs/${name}/${`latest`}_all.log`,
          level: `silly`,
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
        }),

        // application
        new winston.transports.File({
          format: winston.format.combine(timestamp({ store: this.store }), complex()),
          filename: `./logs/${name}.log`,
          level: `silly`,
        }),
      ],
    })

    // @ts-ignore
    this.winston.store = this.store
  }

  child(name: string, level?: LogLevel): ILogger {
    return new WinstonLogger(`${this.name}/${name}`, level ?? this.level)
  }

  builder(options: Partial<BuilderOptions> = {}): Builder {
    return new Builder(this, options)
  }

  logWithStyles(level: LogLevel, texts: string[], styles: string[]) {
    this.log(level, texts.join(` `))
  }

  log(level: LogLevel, message: string) {
    this.winston[level](message)
  }
}
