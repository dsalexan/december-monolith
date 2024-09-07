import Node from "../../node"
import { NodeTreeOperationOptions } from "../../node/node/operations/syntactical"
import { ScopeManager } from "../../node/scope"
import type Grammar from "../../type/grammar"

import { RuleMatchState } from "./match"

export interface ReplaceNodesAt {
  type: `REPLACE_NODES_AT`
  node: Node
  indexes: number[]
}

export interface AddNodeAt {
  type: `ADD_NODE_AT`
  node: Node
  index: number
  preserveExistingNode: boolean | `ignore`
}

export interface RemoveNode {
  type: `REMOVE_NODE`
}

export interface KeepNode {
  type: `KEEP_NODE`
}

export interface ReplaceNode {
  type: `REPLACE_NODE`
  node: Node
  refreshIndexing: boolean
}

export const KEEP_NODE = () => ({ type: `KEEP_NODE` }) as KeepNode
export const REMOVE_NODE = () => ({ type: `REMOVE_NODE` }) as RemoveNode
export const REPLACE_NODE = (node: Node, refreshIndexing = false) => ({ type: `REPLACE_NODE`, node, refreshIndexing }) as ReplaceNode
export const REPLACE_NODES_AT = (node: Node, ...indexes: number[]) => ({ type: `REPLACE_NODES_AT`, indexes, node }) as ReplaceNodesAt
export const ADD_NODE_AT = (node: Node, index: number, preserveExistingNode: boolean | `ignore` = false) => ({ type: `ADD_NODE_AT`, index, node, preserveExistingNode }) as AddNodeAt

export type IReplacementCommand = ReplaceNode | RemoveNode | KeepNode | ReplaceNodesAt | AddNodeAt

export type IRuleReplacement = (originalNode: Node, match: RuleMatchState, context: ReplacementContext) => IReplacementCommand | Node

export interface ReplacementContext {
  grammar: Grammar
  mutationTag: string
  run: number
  operationOptions?: Partial<NodeTreeOperationOptions>
  scopeManager: ScopeManager
}
