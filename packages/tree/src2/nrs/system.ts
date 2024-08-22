import Node from "../node"

import { Rule, MatchState } from "./rule"

export const REMOVE_NODE = Symbol.for(`NRS:REMOVE_NODE`)
export const KEEP_NODE = Symbol.for(`NRS:KEEP_NODE`)
export type NRSAction = typeof REMOVE_NODE | typeof KEEP_NODE

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
    let node: Node | NRSAction = originalNode

    for (const [i, rule] of this.ruleset.entries()) {
      const match = rule.match(node)

      const allMandatoryMatched = Object.values(match.mandatoryMatches).every(Boolean)
      if (allMandatoryMatched) {
        // TODO: Implement a "flat toString" for node, showing a inline name representation for the node
        // TODO: Store this inline flat toString in changes
        changes.push({ rule, state: match })
        node = rule.replace(node, match)

        if (!(node instanceof Node)) break
      }
    }

    return changes.length > 0 ? node : KEEP_NODE
  }
}
