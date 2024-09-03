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
import { BasePattern } from "../../../../utils/src/match/base"
import { NodePattern } from "../../match/pattern"

export function SyntacticalRuleAdder(this: Type, priority: number, arity: number, { incompleteArity, parent }: Partial<SyntacticalRule> = {}) {
  this._syntactical = new SyntacticalRule()

  this._syntactical.priority = priority
  this._syntactical.arity = arity
  this._syntactical.incompleteArity = incompleteArity ?? false
  this._syntactical.parent = parent

  return this
}

export function SyntacticalRuleDeriver(this: Type, arity: number, { priority, incompleteArity, parent }: Partial<SyntacticalRule> = {}) {
  assert(this.lexical || this.semantical, `deriveSyntactical requires either a LexicalRule or SemanticalRule to derive from`)

  this.addSyntactical(priority ?? this.lexical?.priority ?? this.syntactical?.priority, arity, { incompleteArity, parent })

  return this
}

export default class SyntacticalRule {
  public priority: number
  // nullary, unary, binary, ternary, ...; i.e. N
  //    0 means that the type (when use as a syntax node) should have no children (a leaf, like literals or whitespaces)
  //    1 means that the syntax node should gave have only one child (like the root node)
  //    2 means that the syntax node should have exactly two children (like binary operators; like ADDITION or AND)
  //    Infinity means that the syntax node can have any number of children (like a list of nodes; that is a thing when I need to group literals together without loosing original granularity of lexical tokens)
  public arity: number
  public incompleteArity: boolean
  public parent?: NodePattern
}

export function defaultSyntacticalRule(type: Type) {
  const syntactical = new SyntacticalRule()

  const priority = type.lexical?.priority ?? type.semantical?.priority

  assert(!isNil(priority), `defaultSyntacticalRule requires at least a base priority (from lexial or semantical) to derive from type`)

  syntactical.priority = priority!
  syntactical.arity = 0
  syntactical.incompleteArity = false

  return syntactical
}
