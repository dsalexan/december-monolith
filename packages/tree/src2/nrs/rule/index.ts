import { BasePattern } from "@december/utils/match/base"
import type Node from "../../node"
import assert from "assert"

export { default as Rule } from "./rule"

export { RuleMatchState } from "./match"

export { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT, ADD_NODE_AT } from "./replacement"
export { type IReplacementCommand } from "./replacement"

// export type RuleMatchResult = boolean
// export type RuleMatchFunction = (node: Node) => RuleMatchResult

type Nullable<T> = T | null
type Maybe<T> = T | undefined

// #region Generics

type TPredicate = (predicate: (node: Node) => boolean) => (node: Nullable<Node>) => Nullable<Node>
type TFilter = (fn: (node: Node) => Nullable<Node>) => (nodes: Node[]) => Node[]

export const predicate: TPredicate = predicate => node => (node && predicate(node) ? node : null)
export const filter: TFilter = fn => nodes =>
  nodes.filter(node => {
    const test = fn(node)

    return test !== null
  })

// #endregion

// #region Node Pattern

type TMatch_Node = (pattern: BasePattern) => (node: Nullable<Node>) => Nullable<Node>
type TMatch_InChildren = (pattern: BasePattern) => (node: Nullable<Node>) => Node[]

export const match: TMatch_Node = pattern => node => (node && pattern.match(node) ? node : null)
export const matchInChildren: TMatch_InChildren = pattern => node => node?.children.filter(match(pattern)) ?? []

// #endregion

// #region Node Hierarchy

type TAncestor = (level: number) => (node: Nullable<Node>) => Nullable<Node>
type TPosition = (position: number) => (nodes: Node[]) => Nullable<Node>
type TOffspring = (level: number) => (node: Nullable<Node>) => Node[]
type TOffspring_At = (level: number, position: number) => (node: Nullable<Node>) => Nullable<Node>
type TFirstChild = (node: Nullable<Node>) => Nullable<Node>

type TLeftOperand = (node: Nullable<Node>) => Nullable<Node>
type TRightOperand = (node: Nullable<Node>) => Nullable<Node>

export const ancestor: TAncestor = level => node => node?.ancestor(level) ?? null
export const position: TPosition = position => nodes => nodes[position]
export const offspring: TOffspring = level => node => node?.offspring(level) ?? []
export const offspringAt: TOffspring_At = (level, position) => node => (node?.offspring(level) ?? [])[position] ?? null
export const firstChild: TFirstChild = offspringAt(1, 0)
export const leftOperand: TLeftOperand = firstChild
export const rightOperand: TRightOperand = offspringAt(1, 1)

type TNextSibling = (node: Nullable<Node>) => Nullable<Node>

export const nextSibling: TNextSibling = node => {
  const parent = node?.parent

  assert(parent, `Node should have a parent to have a sibling`)

  const index = parent.children.findIndex(child => child.id === node.id)
  assert(index === node.index, `Node index should be correct`)

  return parent.children.nodes[index + 1] ?? null
}

// #endregion
