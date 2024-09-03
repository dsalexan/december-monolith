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
import assert from "assert"
import Node from "../../node"
import Environment from "../../environment"
import { RuleSet } from "../../nrs/rule/rule"

export interface SemanticalTypeHierarchy {}

export function SemanticalRuleAdder(this: Type, priority: number, ruleset: RuleSet | null = null) {
  this._semantical = new SemanticalRule()

  this._semantical.priority = priority
  // this._semantical.environment = environment
  this._semantical.ruleset = ruleset

  return this
}

export function SemanticalRuleDeriver(this: Type, ruleset: RuleSet | null = null, { priority }: Partial<SemanticalRule> = {}) {
  assert(this.lexical || this.syntactical, `deriveSemantical requires LexicalRule/SyntacticalRule to derive from`)

  const _priority = priority ?? this.lexical?.priority ?? this.syntactical?.priority
  this.addSemantical(_priority!, ruleset)

  return this
}

export default class SemanticalRule {
  public priority: number
  public ruleset: RuleSet | null
}
