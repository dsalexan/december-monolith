import { orderBy } from "lodash"
import Node from "./node/node"
import SyntaxNode from "./node/syntaxNode"
import SyntaxManager from "./syntax/manager"

export interface TreeOptions {
  strictChildId: boolean // throw error when a child id already exists in parent node
  imaginaryWrap: boolean
}

export const DefaultTreeOptions: TreeOptions = {
  strictChildId: false,
  imaginaryWrap: true,
}

export default class Tree {
  options: TreeOptions

  root: SyntaxNode

  syntaxManager: SyntaxManager

  constructor(syntaxManager: SyntaxManager, options: Partial<TreeOptions> = {}) {
    this.options = { ...DefaultTreeOptions, ...options }

    this.syntaxManager = syntaxManager
  }

  /** return all nodes in a specific level */
  level(level: number) {
    const nodes = [] as SyntaxNode[]
    const queue = [this.root] as SyntaxNode[]

    while (queue.length > 0) {
      const node = queue.shift()!
      if (node.level === level) nodes.push(node as SyntaxNode)
      else queue.push(...(node.children as SyntaxNode[]))
    }

    return nodes
  }

  /** index all nodes per level */
  levels() {
    const list = [[this.root]] as SyntaxNode[][]

    let newLeaves
    do {
      const leaves = list[list.length - 1]

      newLeaves = []
      for (const node of leaves) newLeaves.push(...node.children)

      list.push(newLeaves)
      // debugger
    } while (newLeaves.length > 0)

    list.pop()

    return list
  }

  /** normalize all ids fowards from root based on their position per level */
  normalize() {
    const levels = this.levels()

    for (let level = levels.length - 1; level >= 0; level--) {
      const nodes = levels[level]

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.id === i) continue

        // const siblings = node.parent?.children ?? []
        // const parentHasConflitingID = siblings.find(node => node.id === i)
        // if (parentHasConflitingID) debugger

        if (node.id === -1) continue
        node.id = i
      }
    }
  }
}
