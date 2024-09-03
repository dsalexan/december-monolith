import Node from "../../node"
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
}

export const REMOVE_NODE = Symbol.for(`NRS:Rule:Replacement:REMOVE_NODE`)
export const KEEP_NODE = Symbol.for(`NRS:Rule:Replacement:KEEP_NODE`)
// export const RELACE_NODE = Symbol.for(`NRS:Rule:Replacement:REPLACE_NODE`) // this is not needed, just return a new node
export const REPLACE_NODES_AT = (node: Node, ...indexes: number[]) => ({ type: `REPLACE_NODES_AT`, indexes, node }) as ReplaceNodesAt
export const ADD_NODE_AT = (node: Node, index: number) => ({ type: `ADD_NODE_AT`, index, node }) as AddNodeAt

export type IReplacementCommand = Node | typeof REMOVE_NODE | typeof KEEP_NODE | ReplaceNodesAt | AddNodeAt

export type IRuleReplacement = (originalNode: Node, match: RuleMatchState, context: ReplacementContext) => IReplacementCommand

export interface ReplacementContext {
  grammar: Grammar
}
