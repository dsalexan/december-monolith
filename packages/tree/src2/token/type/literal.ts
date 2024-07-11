import assert from "assert"
import TokenType from "./base"

export const NUMBER = new TokenType(`literal`, `number`, { type: `regex`, pattern: /^(([0-9]+)|([\.\,][0-9]+)|([0-9]+[\.\,][0-9]+))$/, appendToBuffer: `string` }, Math.pow(10, 10), (token, options) => {
  const value = parseInt(token.lexeme)

  assert(!isNaN(value), `NaN value for number literal`)

  return { value }
})

export const STRING = new TokenType(`literal`, `string`, { type: `regex`, pattern: /^[0-9A-Za-z_$@:]+$/ }, Math.pow(10, 10) + 1)

export const UNKNOWN = new TokenType(`literal`, `unknown`, { type: `none` }, Math.pow(10, 11) + 1)

// WARN: Always update this list when adding a new recipe
export const LITERALS = [NUMBER, STRING, UNKNOWN]
export const LITERAL_NAMES = [`number`, `string`, `unknown`] as const
export type LiteralTokenTypeName = (typeof LITERAL_NAMES)[number]

export const LITERALS_BY_NAME = LITERALS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
