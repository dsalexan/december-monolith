import { Nullable } from "tsdef"

import { LogicalPattern } from "@december/utils/match/logical"

import Node from "../../../node"

import { NodePattern } from "../../../match/pattern"
import assert from "assert"
import { TypeName } from "../../../type/declarations/name"
import { TypeID, TypeModule } from "../../../type/base"

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

type TypeBy = {
  name: TypeName
  id: TypeID
  full: string
  module: TypeModule
}
type By = keyof TypeBy

type TMatch_Node = (pattern: NodePattern | LogicalPattern<NodePattern>) => (node: Nullable<Node>) => Nullable<Node>
type TMatch_InChildren = (pattern: NodePattern) => (node: Nullable<Node>) => Node[]

type TType = <TBy extends By = By>(by: TBy, value: TypeBy[TBy]) => (node: Nullable<Node>) => Nullable<Node>
type TIsLiteralLike = (node: Nullable<Node>) => Nullable<Node>

export const match: TMatch_Node = pattern => node => (node && pattern.match(node) ? node : null)
export const matchInChildren: TMatch_InChildren = pattern => node => node?.children.filter(match(pattern)) ?? []

export const type: TType = (by, value) => node => {
  if (!node) return null

  if (by === `name`) return node.type.name === value ? node : null
  if (by === `id`) return node.type.id === value ? node : null
  if (by === `full`) return node.type.getFullName() === value ? node : null
  if (by === `module`) return node.type.modules.includes(value as TypeModule) ? node : null

  throw new Error(`Invalid type match by "${by}"`)
}
export const isLiteralLike: TIsLiteralLike = node => (node?.type.isLiteralLike() ? node : null)
export const isNotLiteralLike: TIsLiteralLike = node => (!node?.type.isLiteralLike() ? node : null)

// #endregion

// #region Node Hierarchy

type TParent = (node: Nullable<Node>) => Nullable<Node>
type TAncestor = (level: number) => (node: Nullable<Node>) => Nullable<Node>
type TPosition = (position: number) => (nodes: Node[]) => Nullable<Node>
type TOffspring = (level: number) => (node: Nullable<Node>) => Node[]
type TOffspring_At = (level: number, position: number) => (node: Nullable<Node>) => Nullable<Node>
type TFirstChild = (node: Nullable<Node>) => Nullable<Node>

type TLeftOperand = (node: Nullable<Node>) => Nullable<Node>
type TRightOperand = (node: Nullable<Node>) => Nullable<Node>

export const parent: TParent = node => node?.parent ?? null
export const ancestor: TAncestor = level => node => node?.ancestor(level) ?? null
export const position: TPosition = position => nodes => nodes[position]
export const offspring: TOffspring = level => node => node?.offspring(level) ?? []
export const offspringAt: TOffspring_At = (level, position) => node => (node?.offspring(level) ?? [])[position] ?? null
export const firstChild: TFirstChild = offspringAt(1, 0)
export const leftOperand: TLeftOperand = firstChild
export const rightOperand: TRightOperand = offspringAt(1, 1)

type TNextSibling = (node: Nullable<Node>) => Nullable<Node>
type TPreviousSignling = (node: Nullable<Node>) => Nullable<Node>

export const nextSibling: TNextSibling = node => {
  if (!node) return null

  const parent = node?.parent

  assert(parent, `Node should have a parent to have a sibling`)

  const index = parent.children.findIndex(child => child.id === node.id)
  assert(index === node.index, `Node index should be correct`)

  const sibling = parent.children.nodes[index + 1]
  return sibling ?? null
}

export const previousSibling: TPreviousSignling = node => {
  if (!node) return null

  const parent = node?.parent

  assert(parent, `Node should have a parent to have a sibling`)

  const index = parent.children.findIndex(child => child.id === node.id)
  assert(index === node.index, `Node index should be correct`)

  const sibling = parent.children.nodes[index - 1]
  return sibling ?? null
}

// #endregion
