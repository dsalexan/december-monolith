import { compose } from "fp-ts/lib/pipeable"
import assert from "assert"
import Node from "../../node"
import { flow } from "fp-ts/lib/function"
import { BasePattern } from "@december/utils/match/base"
import type { NRSAction } from "../system"

export interface MatchState {
  _matches: (null | { name?: string; pattern: BasePattern; node: Node; optional?: boolean })[]
  matches: Record<string, number> // match name => index at _matches
  mandatoryMatches: Record<number, boolean> // index with match state for all RuleMatches
}

export type StateReliant<T> = (state: MatchState) => T
export type StateMaybe<T> = (state?: MatchState) => T

export type IRuleMatch = (node: Node) => any
export type IRuleReplacement = (node: Node, match: MatchState) => Node | NRSAction

export type StateRuleMatch = StateReliant<IRuleMatch>

export class Rule {
  matching: StateRuleMatch[]
  replacement: IRuleReplacement

  constructor(matching: StateRuleMatch[], replacement: IRuleReplacement) {
    this.matching = matching
    this.replacement = replacement
  }

  match(node: Node): MatchState {
    const state: MatchState = { _matches: [], matches: {}, mandatoryMatches: {} }

    for (const match of this.matching) match(state)(node)

    return state
  }

  replace(node: Node, match: MatchState): Node | NRSAction {
    const allMandatoryMatched = Object.values(match.mandatoryMatches).every(Boolean)

    assert(allMandatoryMatched, `There should not be a replacement without a full mandatory match`)

    const newNode = this.replacement(node, match)

    assert(newNode !== undefined, `Replacement function should return a node or null`)

    return newNode
  }
}
