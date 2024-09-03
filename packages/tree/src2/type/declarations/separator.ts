import assert from "assert"
import { isNil } from "lodash"

import { EQUALS, IS_ELEMENT_OF, IsElementOfSetPattern } from "@december/utils/match/element"
// import { CONTAINED_IN, ContainedInSetPattern } from "@december/utils/match/set"

import Type from "../base"
import type Token from "../../token"
import { EvaluatorOptions } from "../../phases/lexer/evaluation"
import { interleavedInOrder, wrapperInOrder } from "../../node/traversal"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const SEPARATOR_PRIORITY = 10 ** 3

export function openerAndCloserAreTheSame(pattern: IsElementOfSetPattern) {
  return pattern.type === `is_element_of` && pattern.superset[0] === pattern.superset[1]
}

export function WrapperEvaluator(token: Token, options: EvaluatorOptions) {
  let variant: null | `intermediary` | `opener` | `closer` | `opener-and-closer` = null

  const lexical = token.type.lexical!
  const [pattern] = lexical.patterns

  assert(lexical.patterns.length === 1, `Unimplemented multiple patterns`)

  const value = token.lexeme

  if (pattern.type === `equals`) variant = `intermediary`
  else if (pattern.type === `is_element_of`) {
    if (openerAndCloserAreTheSame(pattern) && value === pattern.superset[0]) variant = `opener-and-closer`
    else if (value === pattern.superset[0]) variant = `opener`
    else if (value === pattern.superset[1]) variant = `closer`
  }

  assert(!isNil(variant), `Unknown variant for wrapper separator token`)

  return { value, variant }
}

export const COMMA = new Type(`separator`, `comma`, `C`)
  .addLexical(SEPARATOR_PRIORITY + 15, EQUALS(`,`))
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(interleavedInOrder)
export const COLON = new Type(`separator`, `colon`, `N`)
  .addLexical(SEPARATOR_PRIORITY + 14, EQUALS(`;`))
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(interleavedInOrder)
export const PIPE = new Type(`separator`, `pipe`, `P`)
  .addLexical(SEPARATOR_PRIORITY + 13, EQUALS(`|`))
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(interleavedInOrder)

export const PARENTHESIS = new Type(`separator`, `parenthesis`, `ρ`, [`wrapper`, `context:break`])
  .addLexical(SEPARATOR_PRIORITY + 7, IS_ELEMENT_OF([`(`, `)`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const BRACES = new Type(`separator`, `braces`, `γ`, [`wrapper`, `context:break`])
  .addLexical(SEPARATOR_PRIORITY + 6, IS_ELEMENT_OF([`{`, `}`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const BRACKETS = new Type(`separator`, `brackets`, `β`, [`wrapper`, `context:break`])
  .addLexical(SEPARATOR_PRIORITY + 5, IS_ELEMENT_OF([`[`, `]`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const QUOTES = new Type(`separator`, `quotes`, `κ`, [`wrapper`, `context:break`])
  .addLexical(SEPARATOR_PRIORITY + 4, IS_ELEMENT_OF([`"`, `"`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)
export const PERCENTAGE = new Type(`separator`, `percentage`, `τ`, [`wrapper`, `context:break`])
  .addLexical(SEPARATOR_PRIORITY + 3, IS_ELEMENT_OF([`%`, `%`]), WrapperEvaluator)
  .deriveSyntactical(Infinity)
  .setInOrderBehaviour(wrapperInOrder)

// WARN: Always update this list when adding a new recipe
export const WRAPPER_SEPARATORS = [PARENTHESIS, BRACES, BRACKETS, QUOTES, PERCENTAGE]
export const WRAPPER_SEPARATOR_NAMES = [`parenthesis`, `braces`, `brackets`, `quotes`, `percentage`] as const
export type WrapperSeparatorTypeName = (typeof WRAPPER_SEPARATOR_NAMES)[number]

export const SEPARATORS = [COMMA, COLON, PIPE, ...WRAPPER_SEPARATORS]
export const SEPARATOR_NAMES = [`comma`, `colon`, `pipe`, `list`, ...WRAPPER_SEPARATOR_NAMES] as const
export type SeparatorTypeName = (typeof SEPARATOR_NAMES)[number]

export const SEPARATORS_BY_NAME = SEPARATORS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

export const DEFAULT_SEPARATORS = [COMMA]
