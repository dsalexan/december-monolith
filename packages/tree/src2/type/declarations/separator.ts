import assert from "assert"
import Type from "../base"
import * as Pattern from "../../pattern"
import type Token from "../../token"
import { isNil } from "lodash"
import { EvaluatorOptions } from "../../lexer/evaluation"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const SEPARATOR_PRIORITY = 10

export function isWrapper(type: Type): type is (typeof WRAPPER_SEPARATORS)[number] {
  return type.id === `separator` && WRAPPER_SEPARATOR_NAMES.includes(type.name as WrapperSeparatorTypeName)
}

export function openerAndCloserAreTheSame(pattern: Pattern.ListPattern) {
  return pattern.type === `list` && pattern.values[0] === pattern.values[1]
}

export function WrapperEvaluator(token: Token, options: EvaluatorOptions) {
  let variant: null | `intermediary` | `opener` | `closer` | `opener-and-closer` = null

  const lexical = token.type.lexical!
  const [pattern] = lexical.patterns

  assert(lexical.patterns.length === 1, `Unimplemented multiple patterns`)

  const value = token.lexeme

  if (pattern.type === `string`) variant = `intermediary`
  else if (pattern.type === `list`) {
    if (openerAndCloserAreTheSame(pattern) && value === pattern.values[0]) variant = `opener-and-closer`
    else if (value === pattern.values[0]) variant = `opener`
    else if (value === pattern.values[1]) variant = `closer`
  }

  assert(!isNil(variant), `Unknown variant for wrapper separator token`)

  return { value, variant }
}

export const LIST = new Type(`separator`, `list`, `L`).addSyntactical(SEPARATOR_PRIORITY + 16, Infinity) // list of "nodes", has no lexical equivalent
export const COMMA = new Type(`separator`, `comma`, `C`).addLexical(SEPARATOR_PRIORITY + 15, Pattern.STRING(`,`)).deriveSyntactical(Infinity)
export const COLON = new Type(`separator`, `colon`, `N`).addLexical(SEPARATOR_PRIORITY + 14, Pattern.STRING(`;`)).deriveSyntactical(Infinity)
export const PIPE = new Type(`separator`, `pipe`, `P`).addLexical(SEPARATOR_PRIORITY + 13, Pattern.STRING(`|`)).deriveSyntactical(Infinity)

export const PARENTHESIS = new Type(`separator`, `paranthesis`, `ρ`).addLexical(SEPARATOR_PRIORITY + 7, Pattern.LIST(`(`, `)`), WrapperEvaluator).deriveSyntactical(Infinity)
export const BRACES = new Type(`separator`, `braces`, `γ`).addLexical(SEPARATOR_PRIORITY + 6, Pattern.LIST(`{`, `}`), WrapperEvaluator).deriveSyntactical(Infinity)
export const BRACKETS = new Type(`separator`, `brackets`, `β`).addLexical(SEPARATOR_PRIORITY + 5, Pattern.LIST(`[`, `]`), WrapperEvaluator).deriveSyntactical(Infinity)
export const QUOTES = new Type(`separator`, `quotes`, `κ`).addLexical(SEPARATOR_PRIORITY + 4, Pattern.LIST(`"`, `"`), WrapperEvaluator).deriveSyntactical(Infinity)
export const PERCENTAGE = new Type(`separator`, `percentage`, `τ`).addLexical(SEPARATOR_PRIORITY + 3, Pattern.LIST(`%`, `%`), WrapperEvaluator).deriveSyntactical(Infinity)

// WARN: Always update this list when adding a new recipe
export const WRAPPER_SEPARATORS = [PARENTHESIS, BRACES, BRACKETS, QUOTES, PERCENTAGE]
export const WRAPPER_SEPARATOR_NAMES = [`paranthesis`, `braces`, `brackets`, `quotes`, `percentage`] as const
export type WrapperSeparatorTypeName = (typeof WRAPPER_SEPARATOR_NAMES)[number]

export const SEPARATORS = [COMMA, COLON, PIPE, ...WRAPPER_SEPARATORS]
export const SEPARATOR_NAMES = [`comma`, `colon`, `pipe`, `list`, ...WRAPPER_SEPARATOR_NAMES] as const
export type SeparatorTypeName = (typeof SEPARATOR_NAMES)[number]

export const SEPARATORS_BY_NAME = SEPARATORS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

export const DEFAULT_SEPARATORS = [COMMA]
