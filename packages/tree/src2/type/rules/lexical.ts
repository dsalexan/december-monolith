/**
 * LEXER
 *
 * tokenizer => expression -> words (no really tokens, since tokens require type)
 * scanner => words -> tokens
 * evaluator => evaluate(tokens) (finish setting tokens)
 */

import { isArray, isNil } from "lodash"
import { Match } from "@december/utils"
import type Type from "../base"
import { EvaluateFunction } from "../../phases/lexer/evaluation"

export function LexicalRuleAdder(this: Type, priority: number, patterns: Match.Pattern | Match.Pattern[], evaluate?: EvaluateFunction | undefined) {
  this.lexical = new LexicalRule()

  this.lexical.priority = priority
  this.lexical.patterns = isArray(patterns) ? [...patterns] : [patterns]
  this.lexical.evaluate = evaluate ?? ((token, options) => ({ value: token.lexeme }))

  return this
}

export default class LexicalRule {
  public priority: number
  public patterns: Match.Pattern[]
  public evaluate: EvaluateFunction
}
