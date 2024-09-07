import assert from "assert"
import Node from "../../node"

import { BindingResult, RuleMatch, RuleMatchFunction, RuleMatchResult, RuleMatchState } from "./match"
import { IReplacementCommand, IRuleReplacement, REPLACE_NODE, ReplacementContext } from "./replacement"
import { isArray } from "lodash"
import Type from "../../type/base"

export default class Rule {
  name: string
  matchingFunctions: RuleMatch[]
  replacementFunction: IRuleReplacement

  constructor(name: string, matchingFunctions: (RuleMatch | RuleMatchFunction)[], replacementFunction: IRuleReplacement) {
    this.name = name
    this.matchingFunctions = matchingFunctions.map(match => RuleMatch.from(match))
    this.replacementFunction = replacementFunction
  }

  replace(node: Node, match: RuleMatchState, context: ReplacementContext): IReplacementCommand {
    assert(match.result, `Rule should only be executed if all mandatory matches are true`)

    const newNode = this.replacementFunction(node, match, context)

    assert(newNode !== undefined, `Replacement function should return a command, node or null`)

    return newNode instanceof Node ? REPLACE_NODE(newNode) : newNode
  }

  match(originalNode: Node): RuleMatchState {
    const matches: BindingResult[] = []

    for (let index = 0; index < this.matchingFunctions.length; index++) {
      const match = this.matchingFunctions[index]

      const { out, result } = match.exec(originalNode)

      matches.push({ result, out, match })
    }

    const mandatory = matches.filter(({ result, match }) => !match.optional)
    const optional = matches.filter(({ result, match }) => match.optional)

    const result = mandatory.length === 0 ? optional.some(({ result }) => result === true) : mandatory.every(({ result }) => result === true)

    return {
      matches,
      result,
    }
  }
}

export class RuleSet {
  name: string
  rules: Map<string, Rule>
  grammar: Type[]

  constructor(name: string) {
    this.name = name
    this.rules = new Map()
    this.grammar = []
  }

  addRule(rule: Rule): this {
    this.rules.set(rule.name, rule)

    return this
  }

  addFunctions(name: string, matchingFunctions: (RuleMatch | RuleMatchFunction)[], replacementFunction: IRuleReplacement): this {
    this.addRule(new Rule(name, matchingFunctions, replacementFunction))

    return this
  }

  add(rule: Rule): this
  add(name: string, matchingFunctions: MaybeArray<RuleMatch | RuleMatchFunction>, replacementFunction: IRuleReplacement): this
  add(ruleOrName: Rule | string, matchingFunctions?: MaybeArray<RuleMatch | RuleMatchFunction>, replacementFunction?: IRuleReplacement): this {
    if (ruleOrName instanceof Rule) {
      this.addRule(ruleOrName)
    } else {
      this.addFunctions(ruleOrName as string, (isArray(matchingFunctions) ? matchingFunctions : [matchingFunctions]) as RuleMatch[], replacementFunction as IRuleReplacement)
    }

    return this
  }

  addGrammar(...types: Type[]) {
    this.grammar.push(...types)

    return this
  }
}

type MaybeArray<T> = T | T[]
