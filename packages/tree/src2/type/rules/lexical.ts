/**
 * LEXER
 *
 * tokenizer => expression -> words (no really tokens, since tokens require type)
 * scanner => words -> tokens
 * evaluator => evaluate(tokens) (finish setting tokens)
 */

import assert from "assert"
import { isArray, isNil } from "lodash"
import { MaybeUndefined } from "tsdef"

import { Match } from "@december/utils"

import type Type from "../base"
import { EvaluateFunction, LexemeEvaluateFunction } from "../../phases/lexer/evaluation"
import { MatchFunction, PatternMatchFunction } from "./../../phases/lexer/match"

export function LexicalRuleAdder(this: Type, priority: number, patterns: Match.Pattern | Match.Pattern[], evaluate?: EvaluateFunction | undefined, match?: MaybeUndefined<MatchFunction>) {
  this._lexical = new LexicalRule()

  this._lexical.priority = priority
  this._lexical.patterns = isArray(patterns) ? [...patterns] : [patterns]
  //
  this._lexical.match = match ?? PatternMatchFunction
  this._lexical.evaluate = evaluate ?? LexemeEvaluateFunction

  return this
}

export function LexicalRuleDeriver(this: Type, patterns: Match.Pattern | Match.Pattern[], { priority, evaluate, match }: Partial<LexicalRule> = {}) {
  assert(this.syntactical || this.semantical, `deriveSyntactical requires either a LexicalRule/SemanticalRule to derive from`)

  priority ??= this.syntactical?.priority ?? this.semantical?.priority
  this.addLexical(priority!, patterns, evaluate, match)

  return this
}

export default class LexicalRule {
  public priority: number
  public patterns: Match.Pattern[]
  //
  public match: MatchFunction
  public evaluate: EvaluateFunction
}
