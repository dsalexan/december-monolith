import assert from "assert"
import { MaybeUndefined, Nullable } from "tsdef"

import churchill, { Block, paint, Paint } from "../../logger"

import { Node } from "../../tree"
import { isBoolean, isNumber, isString } from "lodash"

export interface PatternTargetMatch {
  target: number | string // node index
}

export interface PatternTargetMapMatch {
  target: Record<string, Node> // arbitrary tag/key -> node
}

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export type PatternBooleanMatch = boolean
export type PatternMatch = PatternBooleanMatch | PatternTargetMatch | PatternTargetMapMatch

export type GraphRewritingPattern = (node: Node) => PatternMatch

export const REMOVE_NODE = Symbol.for(`graph-rewriting-system:remove-node`)
export type RemoveNode = typeof REMOVE_NODE
export type GraphRewritingReplacementFunction = (node: Node, { match }: { match: PatternMatch }) => MaybeUndefined<Node | RemoveNode>

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
      // _logger.add(paint.bold(node.name))

      const changedNode = this.applyNode(node)

      // _logger
      //   .add(paint.grey.dim(` -> `))
      //   .add(changedNode?.getContent() ?? `<nothing>`)
      //   .info()

      // update root if necessary
      if (i === nodes.length - 1 && changedNode) root = changedNode
    }

    return root
  }

  /** Apply rewriting rules to node and its surroundings (the function already modifies the tree internally) */
  public applyNode(node: Node): Nullable<Node> {
    let DEBUG = false // COMMENT

    // if (node.name === `o1.a`) debugger

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

          let _match = String(match)
          // check if match is PatternTargetMatch
          if (!isBoolean(match)) {
            const { target } = match as PatternTargetMatch | PatternTargetMapMatch

            if (isNumber(target) || isString(target)) _match = String(target)
            else {
              const entries: string[] = []
              for (const [key, value] of Object.entries(target)) entries.push(`${key}: ${value.name}`)
              _match = `{ ${entries.join(`, `)} }`
            }
          }

          const replacement = rule.replacement(current, { match })
          if (replacement === undefined) {
            if (DEBUG)
              _logger
                .add(`  `.repeat(changes + 1))
                .add(paint.dim.grey(rule.key), ` `)
                .add(paint.dim.grey(`match: ${_match}`))
                .info()
            continue
          }

          if (replacement instanceof Node) {
            if (DEBUG)
              _logger
                .add(`  `.repeat(changes + 1))
                .add(paint.blue(rule.key), ` `)
                .add(paint.dim.grey(`match: ${_match}`))
                .info()
            if (parent) parent.replaceChild(replacement, index!)

            current = replacement
          } else {
            if (DEBUG)
              _logger
                .add(`  `.repeat(changes + 1))
                .add(paint.red(rule.key), ` `)
                .add(paint.dim.grey(`match: ${_match}`))
                .info()
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
