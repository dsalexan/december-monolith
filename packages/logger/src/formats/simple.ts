import { differenceInMilliseconds, format } from "date-fns"
import winston from "winston"
import { injectElapsedTime } from "./utils"

import chalk from "chalk"
import { isString } from "lodash"

const levelColors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.white,
  data: chalk.green, // replacing http for npm
  verbose: chalk.grey,
  debug: chalk.blue,
  silly: chalk.magenta,
}

export default function ({ colorize = false }: { colorize?: boolean } = {}) {
  const print = winston.format.printf(function (info) {
    const timestamp = info.timestamp ?? new Date()
    const lastTimestamp = info.lastTimestamp

    const splat = info[Symbol.for(`splat`)]?.[0] as Record<string, any>

    const duration =
      info.durationMs ??
      splat?.durationMs ??
      ((info.duration || info.timeSinceLastLog || info.elapsed) && lastTimestamp !== undefined && lastTimestamp !== null
        ? differenceInMilliseconds(timestamp, lastTimestamp)
        : undefined)

    const formattedMessage = injectElapsedTime(info.message, duration, { colorize })
    const formattedTimestamp = format(timestamp, `HH:mm:ss:SSS`)

    const levelColor = levelColors[info.level as any as keyof typeof levelColors] ?? ((a: any) => a)

    const text = `${chalk.gray(`[${formattedTimestamp}]`)} [${info.label}] ${levelColor(info.level.toLocaleUpperCase())} ${formattedMessage}`

    return text
  })

  if (!colorize) return print

  return winston.format.combine(print)
}
