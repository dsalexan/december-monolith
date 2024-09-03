import assert from "assert"

import { Range } from "@december/utils"

import { Node } from "../../base"

import { createIndexing, NodeIndexing } from "../../indexing"
import { isArray, range, reverse } from "lodash"
import { NodeCollectionOperationOptions } from "../../collection"

function assertArity(node: Node, target: number): number {
  assert(node.type.syntactical, `Type "${node.type.name}" has no syntactical rules`)
  const { arity } = node.type.syntactical!

  let name = `n-`
  if (target === 1) name = `un`
  else if (target === 2) name = `bin`
  else if (target === 3) name = `tern`

  assert(arity === target, `Type "${node.type.name}" is not ${name}ary (arity === ${target === Infinity ? `∞` : target})`)

  return arity
}

// ===============================================================================
//                           STATIC IMPLEMENTATIONS
// ===============================================================================
//
// these do not require calling applyOptions
// there do not have NODE as "this" context

/** Adds node to n-ary node */
export function addToNary(nary: Node, child: Node, index?: number, options: Partial<NodeCollectionOperationOptions> = {}) {
  assertArity(nary, Infinity)

  return nary.children.add(child, index, options)
}

/** Adds node to unary node */
export function addToUnary(unary: Node, child: Node, index?: number, options: Partial<NodeCollectionOperationOptions> = {}) {
  assertArity(unary, 1)

  // unary node SHOULD have one or fewer children

  let parent = unary

  // if node already has a child
  //    enlist that child AND add child to that list
  if (unary.children.length === 1) parent = unary.groupChildren([0, 0], undefined, options)

  parent.children.add(child, index, options) // add child to parent (be that unary or its child-list)
}

/** Adds node to binary node */
export function addToBinary(binary: Node, child: Node, index?: number, options: Partial<NodeCollectionOperationOptions> = {}) {
  assertArity(binary, 2)

  // binary node SHOULD have two or fewer children

  let parent = binary

  // if node already has two children
  //    transform last child into a list node AND add child to that list
  if (binary.children.length === 2) parent = binary.groupChildren([1, 1], undefined, options)

  parent.children.add(child, index, options) // add child to parent (be that binary or its last child-list)
}

/** Adds node to ternary node */
export function addToTernary(ternary: Node, child: Node, index?: number, options: Partial<NodeCollectionOperationOptions> = {}) {
  assertArity(ternary, 3)

  // ternary node SHOULD have three or fewer children

  let parent = ternary

  // if node already has tree children
  //    transform last child into a list node AND add child to that list
  if (ternary.children.length === 3) parent = ternary.groupChildren([2, 2], undefined, options)

  parent.children.add(child, index, options) // add child to parent (be that ternary or its last child-list)
}
