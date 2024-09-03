import assert from "assert"

import { Range } from "@december/utils"

import { Node } from "../../base"

import { createIndexing, NodeIndexing } from "../../indexing"
import { isArray, isNil, range, reverse } from "lodash"
import { addToUnary, addToBinary, addToTernary, addToNary } from "../syntactical/arity"
import { NodeCollectionOperationOptions } from "../../collection"

export interface NodeTreeOperationOptions extends NodeCollectionOperationOptions {
  preserveExistingNode: boolean | `ignore`
}

export class SyntacticalOperations {
  node: Node

  constructor(node: Node) {
    this.node = node
  }

  addNode(child: Node, index?: number, options: Partial<NodeTreeOperationOptions> = {}) {
    return addNode(this.node, child, index, options)
  }

  replaceWith(node: Node, options: Partial<NodeTreeOperationOptions> = {}) {
    return replaceWith(this.node, node, options)
  }

  replaceAt(index: number, node: Node, options: Partial<NodeTreeOperationOptions> = {}) {
    assert(this.node.children.nodes[index], `Node does not exist at index ${index}`)

    return replaceWith(this.node.children.nodes[0], node, options)
  }
}

// ===============================================================================
//                           GENERIC IMPLEMENTATIONS
// ===============================================================================
//
// these do not require calling applyOptions

/** Add node to parent (respecting syntactical rules) */
function addNode(parent: Node, child: Node, index?: number, options: Partial<NodeTreeOperationOptions> = {}) {
  assert(parent.type.syntactical, `Type "${parent.type.name}" has no syntactical rules`)

  let existingNode: Node | null = null

  // 1. Check if something already exists at that index
  const indexIsOccupied = !isNil(index) && parent.children.nodes[index] !== undefined
  if (indexIsOccupied && options.preserveExistingNode !== `ignore`) {
    const preserveExistingNode = options.preserveExistingNode ?? false

    if (!preserveExistingNode) throw new Error(`Node (${parent.children.nodes[index].name}) already exists at index ${index}`)

    // TODO: Untested
    if (child.parent) debugger

    // preserve existing node (as a child of "child", i.e. grandchild of parent)
    existingNode = parent.children.remove(index, { ...options, refreshIndexing: false })
  }

  // 2. Add node to parent (while respecting syntactical rules)
  _addNode(parent, child, index, options)

  // 3. Add existing Node as a child of "child" (preserving it)
  if (existingNode) {
    // TODO: What to do if "child" already has children?
    if (child.children.length > 0) debugger

    child.syntactical.addNode(existingNode, undefined, options)
  }

  return child
}

/** Replaces itself with another node */
function replaceWith(self: Node, node: Node, options: Partial<NodeTreeOperationOptions> = {}) {
  assert(self.parent, `Target has no parent`)
  assert(!node.parent || self.root.id === node.root.id, `Node is from a different tree`)

  const parent = self.parent!
  const index = self.index

  parent.children.remove(index, { ...options, refreshIndexing: false }) // remove itself from parent (without refreshing indexing)
  parent.syntactical.addNode(node, index, { ...options, preserveExistingNode: `ignore` }) // add node to parent at index (ignore existing node)

  return node
}

// ===============================================================================
//                                   METHODS
// ===============================================================================

/** Adds node to parent (can specify index) */
function _addNode(parent: Node, child: Node, index?: number, options: Partial<NodeTreeOperationOptions> = {}) {
  assert(parent.type.syntactical, `Type "${parent.type.name}" has no syntactical rules`)

  // #region 1. Arity Check/Insertion
  const { arity } = parent.type.syntactical!
  assert(arity > 0, `Type "${parent.type.name}" is nullary, it should have no children`)

  if (arity === 1) return addToUnary(parent, child, index, options)
  if (arity === 2) return addToBinary(parent, child, index, options)
  if (arity === 3) return addToTernary(parent, child, index, options)
  else if (arity === Infinity) return addToNary(parent, child, index, options)
  else throw new Error(`Unimplemented n-arity "${arity}"`)

  // #endregion
}
