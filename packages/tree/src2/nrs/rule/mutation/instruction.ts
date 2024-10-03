import Node from "../../../node"
import { RuleMatchState } from "../rule"
import { RuleMutationContext } from "./mutation"

export type RuleMutationInstructionGenerator = (originalNode: Node, match: RuleMatchState, context: RuleMutationContext) => RuleMutationInstruction | Node

export interface NoMutationInstruction {
  type: `NO_MUTATION`
}

export interface ComplexMutationInstruction {
  type: `COMPLEX_MUTATION`
}

export interface RemoveNodeInstruction {
  type: `REMOVE_NODE`
}

export interface AddNodeAtInstruction {
  type: `ADD_NODE_AT`
  node: Node
  index: number
  preserveExistingNode: boolean | `ignore`
}

export interface MoveNodeToInstruction {
  type: `MOVE_NODE_TO`
  parent: Node
  node: Node
  index: number | null
  preserveExistingNode: boolean | `ignore`
  refreshIndexing: boolean
}

export interface ReplaceNodeInstruction {
  type: `REPLACE_NODE`
  node: Node
  refreshIndexing: boolean
}

export interface ReplaceNodesAtInstruction {
  type: `REPLACE_NODES_AT`
  node: Node
  indexes: number[]
}

export interface SwapNodesAtInstruction {
  type: `SWAP_NODES_AT`
  A: Node
  B: Node
  refreshIndexing: boolean
}

export interface CollapseNodeInstruction {
  type: `COLLAPSE_NODE`
  node: Node
  refreshIndexing: false
}

export type RuleMutationInstruction =
  | NoMutationInstruction
  | ComplexMutationInstruction
  | ReplaceNodesAtInstruction
  | AddNodeAtInstruction
  | MoveNodeToInstruction
  | RemoveNodeInstruction
  | ReplaceNodeInstruction
  | SwapNodesAtInstruction
  | CollapseNodeInstruction

// #region PROXIES

export const NO_MUTATION = () => ({ type: `NO_MUTATION` }) as NoMutationInstruction
export const COMPLEX_MUTATION = () => ({ type: `COMPLEX_MUTATION` }) as ComplexMutationInstruction
export const REMOVE_NODE = () => ({ type: `REMOVE_NODE` }) as RemoveNodeInstruction
export const ADD_NODE_AT = (node: Node, index: number, preserveExistingNode: boolean | `ignore` = false) => ({ type: `ADD_NODE_AT`, index, node, preserveExistingNode }) as AddNodeAtInstruction
export const REPLACE_NODE = (node: Node, refreshIndexing = false) => ({ type: `REPLACE_NODE`, node, refreshIndexing }) as ReplaceNodeInstruction
export const REPLACE_NODES_AT = (node: Node, ...indexes: number[]) => ({ type: `REPLACE_NODES_AT`, indexes, node }) as ReplaceNodesAtInstruction
export const SWAP_NODES_AT = (A: Node, B: Node, refreshIndexing = false) => ({ type: `SWAP_NODES_AT`, A, B, refreshIndexing }) as SwapNodesAtInstruction
export const MOVE_NODE_TO = (parent: Node, node: Node, index: number | null, preserveExistingNode: boolean | `ignore` = false, refreshIndexing = false) =>
  ({ type: `MOVE_NODE_TO`, parent, node, index, preserveExistingNode, refreshIndexing }) as MoveNodeToInstruction
export const COLLAPSE_NODE = (node: Node) => ({ type: `COLLAPSE_NODE`, node, refreshIndexing: false }) as CollapseNodeInstruction

// #endregion
