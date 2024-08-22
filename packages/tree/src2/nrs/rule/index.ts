import { BasePattern } from "@december/utils/match/base"

import { flow } from "fp-ts/lib/function"
import { isNodePattern, NodePattern } from "../../match/pattern"
import type Node from "../../node"

import { MatchState, StateMaybe, StateReliant } from "./base"

export { Rule } from "./base"
export type { StateRuleMatch, MatchState, StateReliant } from "./base"

// #region Node Pattern

type TPattern_Match = (pattern: BasePattern, name?: string) => (node: Node | null) => Node | null
type TPattern_Filter = (pattern: BasePattern) => (nodes: Node[]) => Node[]

export const match: StateMaybe<TPattern_Match> =
  state =>
  (pattern, name, optional = false) =>
  node => {
    const isMatch = !!node && pattern.match(node)

    // registering match in state
    if (state) {
      const index = state._matches.length

      if (!isMatch) state._matches.push(null)
      else {
        state._matches.push({ name, pattern, node, optional })
        if (name) state.matches[name] = index - 1
      }

      if (!optional) state.mandatoryMatches[index] = isMatch
    }

    return isMatch ? node : null
  }
export const filter: TPattern_Filter = pattern => nodes => nodes.filter(node => pattern.match(node))

// #endregion

// #region Node Hierarchy

type TAncestor = (level: number) => (node: Node | null) => Node | null
type TPosition = (position: number) => (nodes: Node[]) => Node | null
type TOffspring = (level: number) => (node: Node | null) => Node[]
type TOffspring_At = (level: number, position: number) => (node: Node | null) => Node | null
type TFirstChild = (node: Node | null) => Node | null

type TLeftOperand = (node: Node | null) => Node | null
type TRightOperand = (node: Node | null) => Node | null

export const ancestor: TAncestor = level => node => node?.ancestor(level) ?? null
export const position: TPosition = position => nodes => nodes[position]
export const offspring: TOffspring = level => node => node?.offspring(level) ?? []
export const offspringAt: TOffspring_At = (level, position) => node => (node?.offspring(level) ?? [])[position] ?? null
export const firstChild: TFirstChild = offspringAt(1, 0)
export const leftOperand: TLeftOperand = firstChild
export const rightOperand: TRightOperand = offspringAt(1, 1)

// #endregion

// #region Match Access

type TMatch_Index = (index: number) => (node: Node | null) => Node | null
type TMatch_Name = (name: string) => (node: Node | null) => Node | null
type TMatch_Child = (index: number) => (childIndex: number) => (node: Node | null) => Node | null

export const get: StateReliant<TMatch_Index> = state => index => node => state._matches[index]?.node ?? null
export const getName: StateReliant<TMatch_Name> = state => name => node => state._matches[state.matches[name]]?.node ?? null
export const getChild: StateReliant<TMatch_Child> = state => index => childIndex => flow(get(state)(index), offspringAt(1, childIndex))

// #endregion

type Composables = (state: MatchState) => (node: Node | null) => any
