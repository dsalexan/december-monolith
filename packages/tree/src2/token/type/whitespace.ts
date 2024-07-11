import assert from "assert"
import TokenType from "./base"

export const W = new TokenType(`whitespace`, `whitespace`, { type: `regex`, pattern: /^ +$/ }, -Infinity)

// WARN: Always update this list when adding a new recipe
export const WHITESPACES = [W]
export const WHITESPACES_NAMES = [`whitespace`] as const
export type WhitespacesTokenTypeName = (typeof WHITESPACES_NAMES)[number]

export const WHITESPACESS_BY_NAME = WHITESPACES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
