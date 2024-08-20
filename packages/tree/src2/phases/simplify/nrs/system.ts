import { matchNode, type NodePattern } from "../../../match/pattern"
import type Node from "../../../node"

import { Rule, MatchState } from "./rule"

export default class NodeReplacementSystem {
  ruleset: Rule[]

  constructor() {
    this.ruleset = []
  }

  addRule(rule: Rule) {
    this.ruleset.push(rule)
  }

  addRuleSet(ruleset: Rule[]) {
    for (const rule of ruleset) this.addRule(rule)
  }

  exec(originalNode: Node) {
    let changes: { rule: Rule; state: MatchState }[] = []
    let node: Node = originalNode

    for (const [i, rule] of this.ruleset.entries()) {
      const match = rule.match(node)

      if (match._matches.length > 0) {
        changes.push({ rule, state: match })
        node = rule.replace(node, match)
      }
    }

    return changes.length > 0 ? node : null
  }
}
