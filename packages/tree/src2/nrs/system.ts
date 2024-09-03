import Node from "../node"
import type Grammar from "../type/grammar"

import { Rule, IReplacementCommand, RuleMatchState, KEEP_NODE } from "./rule"
import { ReplacementContext } from "./rule/replacement"
import { RuleSet } from "./rule/rule"

export { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT } from "./rule"

export default function exec(rulesets: RuleSet[], originalNode: Node, context: ReplacementContext): IReplacementCommand {
  const changes: { rule: Rule; state: RuleMatchState }[] = []
  let replacements = 0

  let node: IReplacementCommand = originalNode

  for (const ruleset of rulesets) {
    const localGrammar = ruleset.grammar.length ? context.grammar.clone(ruleset.grammar) : context.grammar

    for (const rule of ruleset.rules) {
      const match = rule.match(node)

      if (!match.result) continue

      // TODO: Implement a "flat toString" for node, showing a inline name representation for the node
      // TODO: Store this inline flat toString in changes

      changes.push({ rule, state: match }) // register the change
      const replaceResult = rule.replace(node, match, { ...context, grammar: localGrammar }) // replace current node with the new node

      if (replaceResult !== KEEP_NODE) node = replaceResult
      else replacements++

      if (!(node instanceof Node)) break
    }

    if (!(node instanceof Node)) break
  }

  return changes.length > 0 ? node : KEEP_NODE
}
