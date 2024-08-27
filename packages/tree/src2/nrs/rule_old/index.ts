import { BasePattern } from "@december/utils/match/base"

import { flow } from "fp-ts/lib/function"
import { isNodePattern, NodePattern } from "../../match/pattern"
import type Node from "../../node"

import { MatchOptions, MatchState, registerState, Scoped } from "./base"

export { Rule } from "./base"
export type { StateRuleMatch, MatchState } from "./base"

// #region Node Pattern

type TPattern_Match = (pattern: BasePattern, options: Partial<MatchOptions>) => (node: Node | null) => Node | null
type TPattern_MatchInChildren = (pattern: BasePattern, options: Partial<MatchOptions>) => (node: Node | null) => Node[]
type TPattern_Filter = (pattern: BasePattern) => (nodes: Node[]) => Node[]

export const match: Scoped<TPattern_Match> =
  (state, scope) =>
  (pattern, options = {}) =>
    function (node) {
      const isMatch = !!node && pattern.match(node)

      registerState(state, scope, { ...options, pattern, target: node, result: isMatch }) // registering match in state

      return isMatch ? node : null
    }
export const matchInChildren: Scoped<TPattern_MatchInChildren> =
  (state, scope) =>
  (pattern, options = {}) =>
  node => {
    const children = [...(node?.children ?? [])]

    const matches: Node[] = []
    for (const child of children) {
      const result = match(state, scope)(pattern, options)(child)

      if (result !== null) matches.push(result)
    }

    debugger

    return matches
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
type TMatch_Name = (name: string) => (node: Node | null) => Node[]
type TMatch_Child = (index: number) => (childIndex: number) => (node: Node | null) => Node | null

export const get: Scoped<TMatch_Index> = state => index => node => state.matches[index]?.target ?? null
export const getName: Scoped<TMatch_Name> = state => name => node => (state.matchesByName[name]?.map(index => state.matches[index!]!.target) ?? []).filter(node => !!node)
export const getChild: Scoped<TMatch_Child> = (state, scope) => index => childIndex => flow(get(state, scope)(index), offspringAt(1, childIndex))

// #endregion

type Composables = (state: MatchState) => (node: Node | null) => any
