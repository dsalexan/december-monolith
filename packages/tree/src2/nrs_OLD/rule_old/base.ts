import { compose } from "fp-ts/lib/pipeable"
import assert from "assert"
import Node from "../../node"
import { flow } from "fp-ts/lib/function"
import { BasePattern } from "@december/utils/match/base"
import type { NRSAction } from "../system"

export interface MatchOptions {
  name: string
  optional: boolean
}

export interface MatchEntry extends Partial<MatchOptions> {
  pattern: BasePattern
  target: Node | null
  result: boolean
}

export interface MatchState {
  // _matches: (null | MatchStateEntry)[]
  // matches: Record<string, number[]> // match name => index at _matches
  // mandatoryMatches: Record<number, boolean> // index with match state for all RuleMatches
  // //
  matches: Record<number, MatchEntry>
  matchesByName: Record<string, number[]>
  mandatoryMatches: Record<number, boolean>
}

// export type StateReliant<T> = (state: MatchState) => T
// export type StateMaybe<T> = (state?: MatchState) => T

export interface MatchScope {
  index: number
}
export type Scoped<TFunction, TState extends MatchState | undefined = MatchState> = (state: TState, scope: MatchScope) => TFunction

export type IRuleMatch = (node: Node) => any
export type IRuleReplacement = (node: Node, match: MatchState) => Node | NRSAction

export type StateRuleMatch<TState extends MatchState | undefined = MatchState> = Scoped<IRuleMatch, TState>

export function registerState(state: MatchState, scope: MatchScope, entry: MatchEntry) {
  const ID = scope.index

  state.matches[ID] = entry

  // register overall match of non-optional entries
  if (!entry.optional) state.mandatoryMatches[ID] = entry.result

  // register named match
  if (entry.name && entry.result) {
    state.matchesByName[entry.name] ??= []
    state.matchesByName[entry.name].push(ID)
  }
}

export class Rule {
  matching: StateRuleMatch[]
  replacement: IRuleReplacement

  constructor(matching: StateRuleMatch[], replacement: IRuleReplacement) {
    this.matching = matching

    this.replacement = replacement
  }

  match(node: Node): MatchState {
    const state: MatchState = { matches: [], matchesByName: {}, mandatoryMatches: {} }

    for (const [index, match] of this.matching.entries()) {
      match(state, {
        index,
      })(node)
    }

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
