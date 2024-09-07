/**
 * LEXER
 *
 * tokenizer => expression -> words (no really tokens, since tokens require type)
 * scanner => words -> tokens
 * evaluator => evaluate(tokens) (finish setting tokens)
 */

import { isArray, isNil } from "lodash"

import { Match } from "@december/utils"
import { Primitive } from "@december/utils/typing"

import type Type from "../base"
import { EvaluateFunction } from "../../phases/lexer/evaluation"
import assert from "assert"
import Node from "../../node"
import Environment from "../../environment"
import { RuleSet } from "../../nrs/rule/rule"
import { MasterScope, Scope } from "../../node/scope"
import { NodeInstruction } from "../../phases/reducer/instruction"
import type Reducer from "../../phases/reducer"

export function ReduceRuleAdder(this: Type, getNodeInstruction: IGetNodeInstruction, processNodeInstruction: IProcessNodeInstruction) {
  this._reduce = new ReduceRule()

  this._reduce.getNodeInstruction = getNodeInstruction
  this._reduce.processNodeInstruction = processNodeInstruction

  return this
}

// export function ReduceRuleDeriver(this: Type, ruleset: RuleSet | null = null, { priority }: Partial<ReduceRule> = {}) {
//   assert(this.lexical || this.syntactical, `deriveSemantical requires LexicalRule/SyntacticalRule to derive from`)

//   const _priority = priority ?? this.lexical?.priority ?? this.syntactical?.priority
//   this.addSemantical(_priority!, ruleset)

//   return this
// }

export default class ReduceRule {
  public getNodeInstruction: IGetNodeInstruction
  public processNodeInstruction: IProcessNodeInstruction
}

export type IGetNodeInstruction = (this: Reducer, node: Node, scope: { master: MasterScope; all: Scope[] }) => NodeInstruction
export type IProcessNodeInstruction = (this: Reducer, instruction: NodeInstruction, node: Node, scope: { master: MasterScope; all: Scope[] }) => ProcessedNode
export type ProcessedNode = Node | NonNullable<Primitive> | Function
