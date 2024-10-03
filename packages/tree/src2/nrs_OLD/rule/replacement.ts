import { reverse } from "lodash"
import Node from "../../node"
import { NodeTreeOperationOptions } from "../../node/node/operations/syntactical"
import { ScopeManager } from "../../node/scope"
import type Grammar from "../../type/grammar"

import { RuleMatchState } from "./match"
import type Rule from "./rule"

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

export interface NRSMutation {
  ruleset: string
  rule: Rule
  command: IReplacementCommand
  match: RuleMatchState
}

export const NODE_REMOVED = Symbol.for(`NODE_REMOVED`)

/** Apply mutation to original Node. If any mutation was done, returns a node */
export function mutate(originalNode: Node, mutation: NRSMutation, context: ReplacementContext): Node | null | typeof NODE_REMOVED {
  // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

  const { operationOptions } = context
  const { command } = mutation

  if (command.type === `KEEP_NODE`) {
    registerMutation(originalNode, mutation, context)

    return originalNode
  } else if (command.type === `REMOVE_NODE`) {
    originalNode.parent!.children.remove(originalNode, operationOptions)

    registerMutation(originalNode, mutation, context)

    return NODE_REMOVED
  } else if (command.type === `REPLACE_NODE`) {
    originalNode.syntactical.replaceWith(command.node, { ...operationOptions, preserveExistingNode: command.refreshIndexing ?? operationOptions?.refreshIndexing })

    registerMutation(originalNode, mutation, context)

    return command.node
  } else if (command.type === `REPLACE_NODES_AT`) {
    for (const index of reverse(command.indexes)) originalNode.children.remove(index, { refreshIndexing: false })
    originalNode.syntactical.addNode(command.node, command.indexes[0], operationOptions)

    registerMutation(originalNode, mutation, context)

    return originalNode
  } else if (command.type === `ADD_NODE_AT`) {
    originalNode.syntactical.addNode(command.node, command.index, { ...operationOptions, preserveExistingNode: command.preserveExistingNode ?? operationOptions?.preserveExistingNode })

    registerMutation(originalNode, mutation, context)

    return originalNode
  } else throw new Error(`Invalid node replacement action "${(command as any).type}"`)

  return null
}

function registerMutation(node: Node, mutation: NRSMutation, context: ReplacementContext) {
  node.attributes.mutations ??= {}
  node.attributes.mutations[context.mutationTag] ??= {}
  node.attributes.mutations[context.mutationTag][mutation.ruleset] ??= {}
  node.attributes.mutations[context.mutationTag][mutation.ruleset][mutation.rule.name] = mutation
}
