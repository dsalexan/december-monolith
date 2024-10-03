import { MaybeArray, Nullable } from "tsdef"
import { isArray } from "lodash"

import Type from "../type/base"
import Grammar from "../type/grammar"

import Node from "../node"

import { Rule, RuleName } from "./rule"
import { RuleMatch, RuleMatchFunction } from "./rule/match"
import { RuleMatchState } from "./rule/rule"
import { MutatedNode, NODE_UNCHANGED, RuleMutation, RuleMutationContext } from "./rule/mutation/mutation"
import { RuleMutationInstruction, RuleMutationInstructionGenerator } from "./rule/mutation/instruction"

export interface RuleSetExecutionContext extends RuleMutationContext {
  hash: string
  wasRuleExecuted: (node: Node, ruleExecutionID: string) => boolean
}

export interface RuleSetMutationDescription {
  ruleset: string
  rule: Rule
  executionID: string
  //
  match: RuleMatchState
  mutation: Nullable<RuleMutationInstruction>
  node: MutatedNode
}

export class RuleSet {
  name: string
  rules: Map<RuleName, Rule>
  grammar: Type[]

  constructor(name: string) {
    this.name = name
    this.rules = new Map()
    this.grammar = []
  }

  addGrammar(...types: Type[]) {
    this.grammar.push(...types)

    return this
  }

  addRule(rule: Rule): this {
    this.rules.set(rule.name, rule)

    return this
  }

  makeRule(name: string, matching: (RuleMatch | RuleMatchFunction)[], mutation: RuleMutation | RuleMutationInstructionGenerator): this {
    this.addRule(new Rule(name, matching, mutation))

    return this
  }

  add(rule: Rule): this
  add(name: string, matchingFunctions: MaybeArray<RuleMatch | RuleMatchFunction>, mutation: RuleMutation | RuleMutationInstructionGenerator): this
  add(ruleOrName: Rule | string, matchingFunctions?: MaybeArray<RuleMatch | RuleMatchFunction>, mutation?: RuleMutation | RuleMutationInstructionGenerator): this {
    if (ruleOrName instanceof Rule) this.addRule(ruleOrName)
    else {
      this.makeRule(ruleOrName as string, (isArray(matchingFunctions) ? matchingFunctions : [matchingFunctions]) as (RuleMatch | RuleMatchFunction)[], mutation!)
    }

    return this
  }

  /** Execute RuleSet against node (each rule can mutate the node? or just yield a mutation instruction?) */
  exec(node: Node, context: RuleSetExecutionContext): Nullable<RuleSetMutationDescription> {
    // 1. Generate a localized grammar for ruleset (since rulesets can have their own additions to the grammar)
    const localGrammar = this.grammar.length ? context.grammar.clone().add(...this.grammar) : context.grammar

    // 2. Find FIRST rule that yields a mutation
    const rules = [...this.rules.values()]
    // if (global.__DEBUG_LABEL_NRS === `simplify[2]:+1.a`) debugger // COMMENT
    for (const [i, rule] of rules.entries()) {
      // if (global.__DEBUG_LABEL_NRS === `simplify[2]:+1.a` && i === 6) debugger // COMMENT
      const ruleExecutionID = rule.getExecutionID(context.hash, this.name)

      // 3. Check if rule should be ignored
      const rejectAlreadyExecutedRule = context.wasRuleExecuted(node, ruleExecutionID)
      if (rejectAlreadyExecutedRule) {
        // if (rule.name === `(_NonLiteral+_Literal1)+_Literal2 -> _NonLiteral+(_Literal1+_Literal2)`) debugger
        continue
      }

      // 4. Match rule against node
      const match = rule.match(node)
      if (match.value) {
        // 5. Generate mutation instructiosn for rule
        //      Sometimes we can get a "COMPLEX_MUTATION", which is a mutation performed during the process of mutation instruction generation
        //      In these cases, mutation.exec won't do much
        const instruction = rule.mutation.apply(node, match, { ...context, grammar: localGrammar })

        // 6. Apply mutation instructions to node
        const mutatedNode = rule.mutation.exec(node, instruction, context)

        return {
          ruleset: this.name,
          rule,
          executionID: `${node.getTreeHash()}::${ruleExecutionID}`,
          //
          match,
          mutation: instruction,
          node: mutatedNode,
        }
      }
    }

    return null
  }
}
