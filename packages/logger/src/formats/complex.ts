import { differenceInMilliseconds, format } from "date-fns"
import winston from "winston"

import { injectElapsedTime } from "./utils"

const pattern = [
  `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)`,
  `(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))`,
].join(`|`)

export default function () {
  const print = winston.format.printf(info => {
    const timestamp = info.timestamp ?? new Date()
    const lastTimestamp = info.lastTimestamp

    const duration =
      info.durationMs ??
      ((info.duration || info.timeSinceLastLog || info.elapsed) && lastTimestamp !== undefined && lastTimestamp !== null
        ? differenceInMilliseconds(timestamp, lastTimestamp)
        : undefined)

    const formattedMessage = injectElapsedTime(info.message, duration, { colorize: false })

    const formattedTimestamp = format(timestamp, `yyyy/MM/dd HH:mm:ss`)

    const text = `[${formattedTimestamp}] [${info.label}] ${info.level.toLocaleUpperCase()} ${formattedMessage}`

    return text.replace(new RegExp(pattern, `g`), ``)
  })

  return print
}
