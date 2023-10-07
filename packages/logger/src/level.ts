export const LOG_LEVELS = [`error`, `warn`, `info`, `data`, `verbose`, `debug`, `silly`] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export const LEVEL_COLOR = {
  error: `red`,
  warn: `yellow`,
  info: `white`,
  data: `green`, // replacing http for npm
  verbose: `grey`,
  debug: `blue`,
  silly: `magenta`,
}
export const LEVEL_COLOR_BROWSER = {
  error: `#ab1111`,
  warn: `#8f7111`,
  info: `black`,
  data: `green`, // replacing http for npm
  verbose: `grey`,
  debug: `blue`,
  silly: `magenta`,
}

export const LEVEL_PRIORITY = {
  error: 0,
  warn: 1,
  info: 2,
  data: 3, // replacing http for npm
  verbose: 4,
  debug: 5,
  silly: 6,
}
