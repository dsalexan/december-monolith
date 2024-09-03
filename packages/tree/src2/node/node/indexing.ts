import assert from "assert"
import { Node } from "./base"

export interface NodeIndexing {
  level: number
  non_whitespace: number
}

export function createIndexing(): NodeIndexing {
  return {
    level: -1,
    non_whitespace: -1,
  }
}

/** Refresh indexing only words from root */
export function refreshIndexing(this: Node) {
  const root = this.root
  assert(root.type.name === `root`, `Only root can update numbers`)

  let lastLevel = -1
  let indexing: NodeIndexing = createIndexing()

  const queue: Node[] = [root]

  while (queue.length) {
    let size = queue.length
    while (size) {
      const node = queue.shift()!

      if (node.level !== lastLevel) {
        lastLevel = node.level

        indexing = createIndexing()
      }

      node.indexing.level = ++indexing.level
      if (node.type.name !== `whitespace` && node.type.name !== `nil`) node.indexing.non_whitespace = ++indexing.non_whitespace

      // gather all the children of node dequeued and enqueue them(left/right nodes)
      node.children.map(child => queue.push(child))

      size--
    }
  }
}

export function updateIndex(this: Node, index: number) {
  this._index = index
}
