import assert from "assert"
import Type from "../base"

import { EQUALS, REGEX } from "@december/utils/match/element"
import { arityInOrder, tokenCollectionInOrder } from "../../node/traversal"
import { LexemeEvaluateFunction, UnitEvaluateFunction } from "../../phases/lexer/evaluation"
import { UnitMatchFunction } from "../../phases/lexer/match"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const LITERAL_PRIORITY = 10 ** 11

export const NUMBER = new Type(`literal`, `number`, `n`, [`operand`, `numeric`, `quantity:numerical-value`]).addLexical(LITERAL_PRIORITY + 2, REGEX(/^(([0-9]+)|([\.][0-9]+)|([0-9]+[\.][0-9]+))$/), (token, options) => {
  const value = parseInt(token.lexeme)

  assert(!isNaN(value), `NaN value for number literal`)

  return { value }
})

export const UNIT = new Type(`literal`, `unit`, `u`, [`operand`]).addLexical(LITERAL_PRIORITY + 1.5, [], UnitEvaluateFunction, UnitMatchFunction)
export const QUANTITY = new Type(`literal`, `quantity`, `q`, [`operand`, `numeric`]).addSyntactical(LITERAL_PRIORITY + 1.4, 1).setInOrderBehaviour(arityInOrder)

export const STRING = new Type(`literal`, `string`, `s`, [`operand`, `quantity:numerical-value`]).addLexical(LITERAL_PRIORITY + 1, REGEX(/^[0-9A-Za-z_$@:\.]+$/))
export const STRING_COLLECTION = new Type(`literal`, `string_collection`, `S`, [`operand`]).addSemantical(LITERAL_PRIORITY + 0.9).setInOrderBehaviour(tokenCollectionInOrder)

export const BOOLEAN = new Type(`literal`, `boolean`, `b`, [`operand`]).addSyntactical(LITERAL_PRIORITY + 0.5, 0)
export const NIL = new Type(`literal`, `nil`, `⌀`).addSyntactical(LITERAL_PRIORITY + 0, 0)
export const UNKNOWN = new Type(`literal`, `unknown`, `?`).addSyntactical(LITERAL_PRIORITY - 1, 0)

// WARN: Always update this list when adding a new recipe
export const LITERALS = [NUMBER, UNIT, QUANTITY, STRING, STRING_COLLECTION, BOOLEAN, UNKNOWN, NIL]
export const LITERAL_NAMES = [`number`, `unit`, `quantity`, `string`, `string_collection`, `boolean`, `unknown`, `nil`] as const
export type LiteralTypeName = (typeof LITERAL_NAMES)[number]

export const LITERALS_BY_NAME = LITERALS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

export const PRIMITIVE_LITERALS = [NUMBER, STRING, BOOLEAN] as const
export type PrimitiveLiteral = (typeof PRIMITIVE_LITERALS)[number]
export const PRIMITIVE_LITERAL_NAMES = [`number`, `string`, `boolean`] as const
export type PrimitiveLiteralName = (typeof PRIMITIVE_LITERAL_NAMES)[number]
