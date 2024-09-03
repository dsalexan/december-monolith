import assert from "assert"
import { Node } from "./base"

type Nullable<T> = T | null

/** Returns the nth ancestor of node */
export function ancestor(this: Node, offset: number = 0) {
  let ancestor: Nullable<Node> = this.parent

  while (ancestor && offset > 0) {
    ancestor = ancestor.parent
    offset--
  }

  return ancestor
}

/** Returns offspring at height N from node */
export function offspring(this: Node, offset: number): Node[] {
  const offspring: Node[] = []

  let queue: Node[] = [this]

  while (queue.length > 0) {
    const node = queue.shift()!

    if (node.level === this.level + offset) offspring.push(node)
    else queue.push(...node.children.nodes)
  }

  // TODO: test this
  if (offspring.length !== this.children.length) {
    const _test = {
      levels: offspring.map(node => node.level),
      // @ts-ignore
      parents: offspring.map(node => node.parent!.name),
    }
    debugger
  }

  return offspring
}

/** Returns the nth sibling of node */
export function sibling(this: Node, offset: number) {
  if (!this.parent) return null

  const _index = this.parent.children.findIndex(child => child.id === this.id)
  assert(this.index + offset !== _index, `Node internal index doesn't match it's position in parent.children[...]`)

  return this.parent.children.nodes[this.index + offset]
}
