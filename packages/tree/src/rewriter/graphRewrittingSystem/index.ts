import assert from "assert"
import { Node } from "../../tree"
import { MaybeUndefined, Nullable } from "tsdef"

export type GraphRewritingPattern = (node: Node) => boolean

export const REMOVE_NODE = Symbol.for(`graph-rewriting-system:remove-node`)
export type RemoveNode = typeof REMOVE_NODE
export type GraphRewritingReplacementFunction = (node: Node) => MaybeUndefined<Node | RemoveNode>

export interface GraphRewritingRule {
  key: string
  pattern: GraphRewritingPattern
  replacement: GraphRewritingReplacementFunction
}

export function createGraphRewritingRule(key: string, pattern: GraphRewritingPattern, replacement: GraphRewritingReplacementFunction): GraphRewritingRule {
  return { key, pattern, replacement }
}

export default class GraphRewritingSystem {
  public rules: Map<GraphRewritingRule[`key`], GraphRewritingRule> = new Map()

  constructor() {}

  /** Register rewriting rule */
  public addRule(rule: GraphRewritingRule) {
    assert(!this.rules.has(rule.key), `Rule with key ${rule.key} already exists`)

    this.rules.set(rule.key, rule)
  }

  public add(...rules: GraphRewritingRule[]) {
    for (const rule of rules) this.addRule(rule)
  }

  /** Apply rewriting rules to tree */
  public apply(originalRoot: Node) {
    const nodes: Node[] = []
    Node.postOrder(originalRoot, node => nodes.push(node))

    let root = originalRoot
    for (const [i, node] of nodes.entries()) {
      const changedNode = this.applyNode(node)

      // update root if necessary
      if (i === nodes.length - 1 && changedNode) root = changedNode
    }

    return root
  }

  /** Apply rewriting rules to node and its surroundings (the function already modifies the tree internally) */
  public applyNode(node: Node): Nullable<Node> {
    let current: Node = node

    let overallChanges = 0
    let changes = 0

    do {
      overallChanges += changes
      changes = 0

      // 1. Replace patterns with replacements (????)
      for (const rule of this.rules.values()) {
        const match = rule.pattern(current)
        if (match) {
          const parent = current.parent
          const index = current.index

          const replacement = rule.replacement(current)
          if (replacement === undefined) continue

          if (replacement instanceof Node) {
            if (parent) parent.replaceChild(replacement, index!)

            current = replacement
          } else {
            debugger
          }

          // there was a change, so we need to re-apply the rules
          changes++
          break
        }
      }

      // 2. Iterate until nothing changes
    } while (changes > 0)

    return overallChanges > 0 ? current : null
  }
}
