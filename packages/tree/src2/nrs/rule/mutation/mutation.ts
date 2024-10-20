import Grammar from "../../../type/grammar"

import Node, { NodeFactory } from "../../../node"
import { NodeTreeOperationOptions } from "../../../node/node/operations/syntactical"

import { RuleMatchState } from "../rule"
import { REPLACE_NODE, RuleMutationInstruction, RuleMutationInstructionGenerator } from "./instruction"
import { Nullable } from "tsdef"
import { reverse } from "lodash"
import assert from "assert"

export interface RuleMutationContext {
  grammar: Grammar
  operationOptions?: Partial<NodeTreeOperationOptions>
}

export const NODE_UNCHANGED = Symbol.for(`RULE_MUTATION:NODE_UNCHANGED`)
export const NODE_REMOVED = Symbol.for(`RULE_MUTATION:NODE_REMOVED`)
export type MutatedNode = Node | typeof NODE_UNCHANGED | typeof NODE_REMOVED

export class RuleMutation {
  fn: RuleMutationInstructionGenerator

  constructor(fn: RuleMutationInstructionGenerator) {
    this.fn = fn
  }

  static from(generator: RuleMutation | RuleMutationInstructionGenerator) {
    if (generator instanceof RuleMutation) return generator

    return new RuleMutation(generator)
  }

  /** Applies instruction generator to node/match */
  apply(node: Node, match: RuleMatchState, context: RuleMutationContext): RuleMutationInstruction {
    // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    const instructionOrNode = this.fn(node, match, context)

    return instructionOrNode instanceof Node ? REPLACE_NODE(instructionOrNode) : instructionOrNode
  }

  /** Executes mutation instruction to mutate node */
  exec(node: Node, instruction: RuleMutationInstruction, context: RuleMutationContext): MutatedNode {
    // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    const { operationOptions } = context

    if (instruction.type === `NO_MUTATION`) return NODE_UNCHANGED
    else if (instruction.type === `COMPLEX_MUTATION`) return node
    //
    else if (instruction.type === `REMOVE_NODE`) {
      node.parent!.children.remove(node, operationOptions)

      return NODE_REMOVED
    } else if (instruction.type === `ADD_NODE_AT`) {
      node.syntactical.addNode(instruction.node, instruction.index, { ...operationOptions, preserveExistingNode: instruction.preserveExistingNode ?? operationOptions?.preserveExistingNode })

      return node
    } else if (instruction.type === `MOVE_NODE_TO`) {
      const isAncestor = !!instruction.parent.findAncestor(ancestor => ancestor.id === node.id)
      assert(isAncestor, `Instruction target parent should be within node's subtree`)

      instruction.parent.syntactical.addNode(instruction.node, instruction.index ?? 0, { ...operationOptions, preserveExistingNode: instruction.preserveExistingNode ?? operationOptions?.preserveExistingNode })

      return node
    }
    //
    else if (instruction.type === `REPLACE_NODE`) {
      node.syntactical.replaceWith(instruction.node, { ...operationOptions, preserveExistingNode: instruction.refreshIndexing ?? operationOptions?.refreshIndexing })

      return instruction.node
    } else if (instruction.type === `REPLACE_NODES_AT`) {
      for (const index of reverse(instruction.indexes)) node.children.remove(index, { refreshIndexing: false })
      node.syntactical.addNode(instruction.node, instruction.indexes[0], operationOptions)

      return node
    }
    //
    else if (instruction.type === `SWAP_NODES_AT`) {
      const { A, B } = instruction

      A.swapWith(B, { ...operationOptions, refreshIndexing: instruction.refreshIndexing })

      return node
    }

    // @ts-ignore
    throw new Error(`Invalid node mutation instruction "${instruction.type}"`)
  }
}
