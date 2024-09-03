/**
 * LEXER
 *
 * tokenizer => expression -> words (no really tokens, since tokens require type)
 * scanner => words -> tokens
 * evaluator => evaluate(tokens) (finish setting tokens)
 */

import assert from "assert"
import { isArray, isNil } from "lodash"

import { Match } from "@december/utils"

import type Type from "../base"
import { EvaluateFunction } from "../../phases/lexer/evaluation"

export function LexicalRuleAdder(this: Type, priority: number, patterns: Match.Pattern | Match.Pattern[], evaluate?: EvaluateFunction | undefined) {
  this._lexical = new LexicalRule()

  this._lexical.priority = priority
  this._lexical.patterns = isArray(patterns) ? [...patterns] : [patterns]
  this._lexical.evaluate = evaluate ?? ((token, options) => ({ value: token.lexeme }))

  return this
}

export function LexicalRuleDeriver(this: Type, patterns: Match.Pattern | Match.Pattern[], { priority, evaluate }: Partial<LexicalRule> = {}) {
  assert(this.syntactical || this.semantical, `deriveSyntactical requires either a LexicalRule/SemanticalRule to derive from`)

  priority ??= this.syntactical?.priority ?? this.semantical?.priority
  this.addLexical(priority!, patterns, evaluate)

  return this
}

export default class LexicalRule {
  public priority: number
  public patterns: Match.Pattern[]
  public evaluate: EvaluateFunction
}
