import assert from "assert"
import Node from "../../node"

import { BindingResult, RuleMatch, RuleMatchFunction, RuleMatchResult, RuleMatchState } from "./match"
import { IReplacementCommand, IRuleReplacement } from "./replacement"
import { isArray } from "lodash"

export default class Rule {
  matchingFunctions: RuleMatch[]
  replacementFunction: IRuleReplacement

  constructor(matchingFunctions: (RuleMatch | RuleMatchFunction)[], replacementFunction: IRuleReplacement) {
    this.matchingFunctions = matchingFunctions.map(match => RuleMatch.from(match))
    this.replacementFunction = replacementFunction
  }

  replace(node: Node, match: RuleMatchState): IReplacementCommand {
    assert(match.result, `Rule should only be executed if all mandatory matches are true`)

    const newNode = this.replacementFunction(node, match)

    assert(newNode !== undefined, `Replacement function should return a node or null`)

    return newNode
  }

  match(originalNode: Node): RuleMatchState {
    const matches: BindingResult[] = []

    for (let index = 0; index < this.matchingFunctions.length; index++) {
      const match = this.matchingFunctions[index]

      const { out, result } = match.exec(originalNode)

      matches.push({ result, out, match })
    }

    const overallMandatory = matches.map(({ result, match }) => (result ? true : match.optional ? null : false)).filter(result => result === true)

    return {
      matches,
      result: overallMandatory.length > 0,
    }
  }
}

export class RuleSet {
  list: Rule[]

  constructor() {
    this.list = []
  }

  addRule(rule: Rule): this {
    this.list.push(rule)

    return this
  }

  addFunctions(matchingFunctions: (RuleMatch | RuleMatchFunction)[], replacementFunction: IRuleReplacement): this {
    this.addRule(new Rule(matchingFunctions, replacementFunction))

    return this
  }

  add(rule: Rule): this
  add(matchingFunctions: MaybeArray<RuleMatch | RuleMatchFunction>, replacementFunction: IRuleReplacement): this
  add(ruleOrMatchingFunctions: Rule | MaybeArray<RuleMatch | RuleMatchFunction>, replacementFunction?: IRuleReplacement): this {
    if (ruleOrMatchingFunctions instanceof Rule) {
      this.addRule(ruleOrMatchingFunctions)
    } else {
      this.addFunctions(isArray(ruleOrMatchingFunctions) ? ruleOrMatchingFunctions : [ruleOrMatchingFunctions], replacementFunction!)
    }

    return this
  }
}

type MaybeArray<T> = T | T[]
