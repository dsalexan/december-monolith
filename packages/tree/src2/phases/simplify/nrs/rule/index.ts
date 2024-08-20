import { matchNode, NodePattern } from "../../../../match/pattern"
import Node from "../../../../node"

import { MatchState, StateMaybe, StateReliant } from "./base"

export { Rule } from "./base"
export type { StateRuleMatch, MatchState, StateReliant } from "./base"

// #region Node Pattern

type TNodePattern_Match = (pattern: NodePattern, name?: string) => (node: Node | null) => Node | null
type TNodePattern_Filter = (pattern: NodePattern) => (nodes: Node[]) => Node[]

export const match: StateMaybe<TNodePattern_Match> = state => (pattern, name) => node => {
  const isMatch = !!node && matchNode(node, pattern)

  // registering match in state
  if (state && isMatch) {
    state._matches.push({ name, pattern, node })
    if (name) state.matches[name] = state._matches.length - 1
  }

  return isMatch ? node : null
}
export const filter: TNodePattern_Filter = pattern => nodes => nodes.filter(node => matchNode(node, pattern))

// #endregion

// #region Node Hierarchy

type TOffspring = (level: number) => (node: Node | null) => Node[]
type TAncestor = (level: number) => (node: Node | null) => Node | null
type TPosition = (position: number) => (nodes: Node[]) => Node | null

export const offspring: TOffspring = level => node => node?.offspring(level) ?? []
export const ancestor: TAncestor = level => node => node?.ancestor(level) ?? null
export const position: TPosition = position => nodes => nodes[position]

// #endregion

// #region Match Access

type TMatch_Index = (index: number) => (node: Node | null) => Node | null
type TMatch_Name = (name: string) => (node: Node | null) => Node | null

export const get: StateReliant<TMatch_Index> = state => index => node => state._matches[index]?.node ?? null
export const getName: StateReliant<TMatch_Name> = state => name => node => state._matches[state.matches[name]]?.node ?? null

// #endregion

type Composables = (state: MatchState) => (node: Node | null) => any
