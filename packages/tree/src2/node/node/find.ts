import { Node } from "./base"

import { GenericTraversal } from "../traversal"

type Nullable<T> = T | null

/** Find ancestor in tree */
export function findAncestor(predicate: (node: Node) => boolean | null): Nullable<Node> {
  let ancestor: Nullable<Node> = this

  while (ancestor) {
    const result = predicate(ancestor)
    if (result) return ancestor
    if (result === null) break

    ancestor = ancestor.parent
  }

  return null
}

/** Find node in offspring */
export function find(predicate: (node: Node) => boolean): Nullable<Node> {
  if (predicate(this)) return this

  for (const child of this.children.nodes) {
    const found = child.find(predicate)
    if (found) return found
  }

  return null
}

/** Find node by custom traversal */
export function findByTraversal(traversal: GenericTraversal, predicate: (node: Node) => boolean): Nullable<Node> {
  let found: Nullable<Node> = null

  traversal(this, (node, token) => {
    if (predicate(node)) {
      found = node
      return
    }
  })

  return found
}
