import chalk from "chalk"

export function injectElapsedTime(message: string, duration: number, { colorize = false } = {}) {
  if (duration === undefined || duration === null) return message

  let color = ((a: any) => a) as any as chalk.Chalk
  if (colorize) {
    color = chalk.green

    if (duration > 10000) color = chalk.red.bold
    else if (duration > 2000) color = chalk.hex(`#FF8800`).bold
    else if (duration > 1000) color = chalk.yellow
    else if (duration > 100) color = chalk.blue

    color = color.italic
  }

  const pattern = /∂duration/g
  const match = pattern.exec(message)
  if (match) {
    return message.replace(pattern, `${duration}ms`)
  }

  const sign = duration < 0 ? `-` : `+`
  const text = `${message}    ${color(`${sign}${Math.abs(duration)}ms`)}`

  return text
}
