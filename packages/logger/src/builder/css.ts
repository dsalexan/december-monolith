/* eslint-disable no-debugger */

export function parseCSS(style: string) {
  if (style.startsWith(`ansi:`)) {
    return _ansi(style.slice(5))
  }

  if (style.startsWith(`web:`)) {
    const color = style.slice(4)
    return `color: ${color}`
  }

  debugger
  throw new Error(`Unknown CSS style: ${style}`)
}

const LETTERING = [`bold`, `italic`, `underline`, `strikethrough`]

function _ansi(style: string) {
  if (LETTERING.includes(style)) {
    if (style === `bold`) return `font-weight: bold`
    if (style === `italic`) return `font-style: italic`
    if (style === `underline`) return `text-decoration: underline`
    if (style === `strikethrough`) return `text-decoration: line-through`
  }

  if (style.startsWith(`hex:`)) return `color: ${style.slice(4)}`

  if (style === `dim`) debugger // TODO: How to deal with dim?

  const isBright = style.endsWith(`Bright`) // TODO: How to deal with bright?

  if (style.startsWith(`bg`)) {
    const color = style.slice(2, isBright ? -6 : undefined)

    return `background-color: ${color}`
  }

  const color = style.slice(0, isBright ? -6 : undefined)
  return `color: ${color}`
}
