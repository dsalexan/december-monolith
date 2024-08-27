import Node from "../node"

import { Rule, IReplacementCommand, RuleMatchState, KEEP_NODE } from "./rule"
import { RuleSet } from "./rule/rule"

export { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT } from "./rule"

export default class NodeReplacementSystem {
  ruleset: Rule[]

  constructor() {
    this.ruleset = []
  }

  addRule(rule: Rule) {
    this.ruleset.push(rule)
  }

  addRuleSet(ruleset: Rule[] | RuleSet) {
    if (ruleset instanceof RuleSet) ruleset = ruleset.list

    for (const rule of ruleset) this.addRule(rule)
  }

  exec(originalNode: Node): IReplacementCommand {
    const changes: { rule: Rule; state: RuleMatchState }[] = []

    let node: IReplacementCommand = originalNode
    for (let i = 0; i < this.ruleset.length; i++) {
      // if (i === 4) debugger

      const rule = this.ruleset[i]
      const match = rule.match(node)

      if (!match.result) continue

      // TODO: Implement a "flat toString" for node, showing a inline name representation for the node
      // TODO: Store this inline flat toString in changes

      changes.push({ rule, state: match }) // register the change
      node = rule.replace(node, match) // replace current node with the new node

      if (!(node instanceof Node)) break
    }

    return changes.length > 0 ? node : KEEP_NODE
  }
}
