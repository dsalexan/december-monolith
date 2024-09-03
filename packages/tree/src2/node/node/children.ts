import { Node } from "./base"
import { createIndexing } from "./indexing"

export function setParent(this: Node, parent: Node) {
  this._parent = parent
  return this
}

export function removeParent(this: Node) {
  if (this._parent) {
    this._parent = null
    this._index = -1

    this.indexing = createIndexing()
  }
}

export function getChildren(this: Node, maxDepth: number) {
  if (this.level >= maxDepth) return []
  return this.children.nodes
}
