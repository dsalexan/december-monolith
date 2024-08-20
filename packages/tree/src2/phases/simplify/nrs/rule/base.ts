import { compose } from "fp-ts/lib/pipeable"
import assert from "assert"
import { NodePattern } from "../../../../match/pattern"
import Node from "../../../../node"
import { flow } from "fp-ts/lib/function"

export interface MatchState {
  _matches: { name?: string; pattern: NodePattern; node: Node }[]
  matches: Record<string, number> // match name => index at _matches
}

export type StateReliant<T> = (state: MatchState) => T
export type StateMaybe<T> = (state?: MatchState) => T

export type IRuleMatch = (node: Node) => any
export type IRuleReplacement = (node: Node, match: MatchState) => Node

export type StateRuleMatch = StateReliant<IRuleMatch>

export class Rule {
  matching: StateRuleMatch[]
  replacement: IRuleReplacement

  constructor(matching: StateRuleMatch[], replacement: IRuleReplacement) {
    this.matching = matching
    this.replacement = replacement
  }

  match(node: Node): MatchState {
    const state: MatchState = { _matches: [], matches: {} }

    for (const match of this.matching) match(state)(node)

    return state
  }

  replace(node: Node, match: MatchState): Node {
    assert(match._matches.length > 0, `There should not be a replacement without a match`)

    const newNode = this.replacement(node, match)

    assert(newNode !== undefined, `Replacement function should return a node or null`)

    return newNode
  }
}
