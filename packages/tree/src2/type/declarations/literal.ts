import assert from "assert"
import Type from "../base"
import { Match } from "@december/utils"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const LITERAL_PRIORITY = 1000000

export const NUMBER = new Type(`literal`, `number`, `n`)
  .addLexical(LITERAL_PRIORITY + 2, Match.Value.REGEX(/^(([0-9]+)|([\.][0-9]+)|([0-9]+[\.][0-9]+))$/), (token, options) => {
    const value = parseInt(token.lexeme)

    assert(!isNaN(value), `NaN value for number literal`)

    return { value }
  })
  .deriveSyntactical(0)

export const STRING = new Type(`literal`, `string`, `s`).addLexical(LITERAL_PRIORITY + 1, Match.Value.REGEX(/^[0-9A-Za-z_$@:\.]+$/)).deriveSyntactical(0)
export const STRING_COLLECTION = new Type(`literal`, `string_collection`, `S`).addSemantical(LITERAL_PRIORITY + 0.9)

export const NIL = new Type(`literal`, `nil`, `⌀`).addSyntactical(LITERAL_PRIORITY + 0, 0)
export const UNKNOWN = new Type(`literal`, `unknown`, `?`).addSyntactical(LITERAL_PRIORITY - 1, 0)

// WARN: Always update this list when adding a new recipe
export const LITERALS = [NUMBER, STRING, UNKNOWN, NIL]
export const LITERAL_NAMES = [`number`, `string`, `string_collection`, `unknown`, `nil`] as const
export type LiteralTypeName = (typeof LITERAL_NAMES)[number]

export const LITERALS_BY_NAME = LITERALS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
