import assert from "assert"

import { Range } from "@december/utils"

import { Node } from "../base"

import { createIndexing, NodeIndexing } from "../indexing"
import { isArray, range, reverse } from "lodash"
import { applyOptions, NodeCollectionOperationOptions } from "../collection"
import NodeFactory from "../../factory"

// ===============================================================================
//                           GENERIC IMPLEMENTATIONS
// ===============================================================================
//
// these do not require calling applyOptions

// ===============================================================================
//                          BASELINE IMPLEMENTATIONS
// ===============================================================================
//
// these DO REQUIRE calling applyOptions

/** Swap two nodes */
export function swapWith(this: Node, other: Node, options: Partial<NodeCollectionOperationOptions> = {}) {
  assert(this.parent, `Node A has no parent`)
  assert(other.parent, `Node B has no parent`)

  const A = {
    id: this.id,
    index: this.index,
    level: this.level,
    node: this,
    parent: this.parent!,
    root: this.root,
  }

  const B = {
    id: other.id,
    index: other.index,
    level: other.level,
    node: other,
    parent: other.parent!,
    root: other.root,
  }

  A.parent.children.remove(
    A.parent.children.findIndex(child => child.id === A.id),
    { ...options, refreshIndexing: false },
  )
  B.parent.children.remove(
    B.parent.children.findIndex(child => child.id === B.id),
    { ...options, refreshIndexing: false },
  )

  B.parent.children.add(A.node, B.index, { ...options, refreshIndexing: false })
  A.parent.children.add(B.node, A.index, { ...options, refreshIndexing: false })

  // ===============================================================================
  applyOptions(this, options) // APPLY OPERATION OPTIONS
  // ===============================================================================
}

/** Group a subset of children from parent into a new node (by default a LIST) */
export function groupChildren(this: Node, [start, end]: [number, number], list?: Node, options: Partial<NodeCollectionOperationOptions> = {}): Node {
  // only if there is more than one list child
  const onlyEnlistOneChild = end - start === 0
  const isFirstChildAList = this.children.nodes[start]?.type?.name === (list?.type.name ?? `list`) // `list`

  // if the only child to enlist is already a list, then just return it
  if (onlyEnlistOneChild && isFirstChildAList) return this.children.nodes[start]

  // if (global.__DEBUG_LABEL === `+->=3.a`) debugger // COMMENT

  // remove children from parent
  const children: Node[] = reverse(range(start, end + 1)).map(i => this.children.remove(i, options))

  // create new list if necessary
  if (!list) {
    const fallbackRange = Range.fromPoint(Range.point(children.length > 0 ? children.map(child => child.range) : this.range, `internal`, `first`, children.length === 0 && this.type.name === `root`))
    list = NodeFactory.LIST(fallbackRange)
  }

  this.syntactical.addNode(list, start, options) // add list to parent

  // transfer children
  for (const child of reverse(children)) list.syntactical.addNode(child, undefined, options)

  return list
}
