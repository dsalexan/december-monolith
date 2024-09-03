import assert from "assert"

import { Node } from "./base"

export interface NodeCollectionOperationOptions {
  refreshIndexing: boolean
}

export function applyOptions(node: Node, options: Partial<NodeCollectionOperationOptions>) {
  // update numbers
  if (options.refreshIndexing ?? true) node.refreshIndexing()
}

// ===============================================================================

export default class NodeCollection {
  parent: Node
  nodes: Node[] = []

  constructor(parent: Node) {
    this.parent = parent
  }

  get length() {
    return this.nodes.length
  }

  get(index: number) {
    return this.nodes[index]
  }

  reduce<TValue = unknown>(callback: (acc: TValue, node: Node, index: number) => TValue, initialValue: TValue) {
    return this.nodes.reduce(callback, initialValue)
  }

  map<TValue = unknown>(callback: (node: Node, index: number) => TValue) {
    return this.nodes.map(callback)
  }

  flatMap<TValue = unknown>(callback: (node: Node, index: number) => TValue[]) {
    return this.nodes.flatMap(callback)
  }

  findIndex(callback: (node: Node, index: number) => boolean) {
    return this.nodes.findIndex(callback)
  }

  filter(callback: (node: Node, index: number) => unknown) {
    return this.nodes.filter(callback)
  }

  // ===============================================================================

  removeAll(options: Partial<NodeCollectionOperationOptions> = {}) {
    for (let i = this.length - 1; i >= 0; i--) this.remove(i, { ...options, refreshIndexing: false })

    // ===============================================================================
    applyOptions(this.parent, options) // APPLY OPERATION OPTIONS
    // ===============================================================================
  }

  /** Remove child (at index) */
  remove(indexOrNode: number | Node, options: Partial<NodeCollectionOperationOptions> = {}) {
    const index = typeof indexOrNode === `number` ? indexOrNode : this.nodes.findIndex(node => node.id === indexOrNode.id)

    if (typeof indexOrNode !== `number`) assert(indexOrNode.index === index, `Index disparity at node "${indexOrNode.name}"`)
    assert(index > -1, `Node not found in children`)
    assert(index < this.length, `Node not found in children`)

    const level = this.parent.level

    // remove child
    const [node] = this.nodes.splice(index, 1)
    node.removeParent()

    // update indexes
    for (let i = index; i < this.nodes.length; i++) this.nodes[i].updateIndex(i)

    // ===============================================================================
    applyOptions(this.parent, options) // APPLY OPERATION OPTIONS
    // ===============================================================================

    return node
  }

  add(node: Node, index: number | null = null, options: Partial<NodeCollectionOperationOptions> = {}) {
    // determine index
    if (index === null) index = this.length

    // remove from current parent
    if (node.parent) node.parent.children.remove(node, options)

    // add to list
    this.nodes.splice(index, 0, node)
    node.setParent(this.parent)

    // update indexes
    for (let i = index; i < this.nodes.length; i++) this.nodes[i].updateIndex(i)

    // ===============================================================================
    applyOptions(this.parent, options) // APPLY OPERATION OPTIONS
    // ===============================================================================
  }
}
