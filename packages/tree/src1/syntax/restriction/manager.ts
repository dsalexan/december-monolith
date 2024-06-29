import { compare } from "@december/utils"

import { getHierarchicalOffset, getHierarchicalOffsetLabel, SyntaxHierarchicalTarget, SyntaxRestriction } from "."
import type { TreeParsingStage } from "../../parser"
import { cloneDeep, has, isArray, omit, uniq } from "lodash"
import type { SyntaxNode } from "../../node"

type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>

export type FastSyntaxRestriction = Optional<SyntaxRestriction, `stage` | `comparison`>
export type SyntaxRestrictionMap = Partial<Record<number | SyntaxHierarchicalTarget, Omit<FastSyntaxRestriction, `hierarchicalOffset`>[]>>

export type InvalidSyntaxRestriction = { restriction: SyntaxRestriction; hierarchicalOffset: number }

export default class SyntaxRestrictionManager {
  restrictions: Record<TreeParsingStage, SyntaxRestriction[]> = {} as any
  count = 0

  constructor(...restrictions: (SyntaxRestriction | SyntaxRestrictionMap)[]) {
    if (restrictions) this.add(...restrictions)
  }

  add(...restrictions: (SyntaxRestriction | SyntaxRestrictionMap)[]) {
    for (const restriction of restrictions) {
      const isMap = !has(restriction, `stage`)

      if (isMap) this._addFromMap(restriction as any)
      else this._add(restriction as any)
    }
  }

  _add(restriction: SyntaxRestriction) {
    if (!this.restrictions[restriction.stage]) this.restrictions[restriction.stage] = []

    this.restrictions[restriction.stage].push(restriction)
    this.count++
  }

  _addFromMap(map: SyntaxRestrictionMap) {
    const keys = Object.keys(map) as (keyof SyntaxRestrictionMap)[]

    for (const at of keys) {
      const fastSyntaxRestrictions = map[at]!

      for (const fastSyntaxRestriction of fastSyntaxRestrictions) {
        let stage: TreeParsingStage = `resolve`
        let comparison: compare.OneToManyComparisonBlueprint = { oneToManyOperation: `some` }

        this.add({
          ...fastSyntaxRestriction,
          stage: fastSyntaxRestriction.stage ?? stage,
          comparison: fastSyntaxRestriction.comparison ?? comparison,
          syntaxes: cloneDeep(fastSyntaxRestriction.syntaxes),
          hierarchicalOffset: getHierarchicalOffset(at),
        })
      }
    }
  }

  clone() {
    const clone = new SyntaxRestrictionManager()
    clone.restrictions = cloneDeep(this.restrictions)
    return clone
  }

  toMap(): SyntaxRestrictionMap {
    const map = {} as SyntaxRestrictionMap

    for (const stage of Object.keys(this.restrictions)) {
      map[stage] = []

      for (const restriction of this.restrictions[stage]) {
        const at = restriction.hierarchicalOffset
        if (map[at] === undefined) map[at] = []

        const syntaxRestriction: Omit<SyntaxRestriction, `hierarchicalOffset`> = omit(cloneDeep(restriction) as SyntaxRestriction, `hierarchicalOffset`)

        map[at]!.push(syntaxRestriction)
      }
    }

    return map
  }

  shouldValidate(stage: TreeParsingStage, at?: number | SyntaxHierarchicalTarget) {
    if (at === undefined) return !!this.restrictions[stage]?.length

    if (!this.restrictions[stage]) return false

    const hierarchicalOffset = getHierarchicalOffset(at)
    const restrictions = this.restrictions[stage].filter(restriction => restriction.hierarchicalOffset === hierarchicalOffset)

    return restrictions.length > 0
  }

  validate(node: SyntaxNode, stage: TreeParsingStage, options: Partial<{ full: boolean }> = {}): { valid: boolean; invalidRestrictions: InvalidSyntaxRestriction[] } {
    const invalidRestrictions = [] as InvalidSyntaxRestriction[]

    // 0. skip if there are no restrictions for this stage
    if (!this.restrictions[stage]?.length) return { valid: true, invalidRestrictions }

    const offsets = uniq(this.restrictions[stage].map(restriction => restriction.hierarchicalOffset)) // get all offsets for stage

    // 1. index all nodes by offset
    const offsetNodes = Object.fromEntries(
      offsets.map(offset => {
        let nodes: SyntaxNode[] = []

        if (offset === -201) {
          // up 2 generations
          // WARN: Here, and only here, we ignore all offsets that are only "list"
          let o = -1
          while (nodes.length < 2) {
            const [ancestor] = node.offset(o--) as SyntaxNode[]
            if (ancestor.syntax.name !== `list`) nodes.push(ancestor)
          }
        } else if (Number.isInteger(offset)) nodes = node.offset(offset) as SyntaxNode[]
        else {
          if (offset === -0.1) {
            nodes = node.siblings(-1) as SyntaxNode[]
          } else if (offset === 0.1) {
            nodes = node.siblings(1) as SyntaxNode[]
          } else {
            // ERROR: Unimplemented hierarchical offset
            debugger
          }
        }

        return [offset, nodes]
      }),
    ) as Record<number, SyntaxNode[]>

    // 2. validate each offset
    for (const offset of offsets) {
      const _at = getHierarchicalOffsetLabel(offset)
      const nodes = offsetNodes[offset]
      const restrictions = this.restrictions[stage].filter(restriction => restriction.hierarchicalOffset === offset) // get all restrictions for offset

      /**
       * restriction
       *    comparison: blueprint of how to compare a VALUE against a SET of values from all NODES in OFFSET
       *    syntaxes: a list of syntax definitions that determine VALUE
       *    hierarchicalOffset: offset level to determine NODES (each node will yield a value into a SET to make the comparison)
       */

      // for each restriction in offset level
      for (const restriction of restrictions) {
        // 1. recover comparison pairs (value, set)
        const values = [] as unknown[]
        const nodeSets = [] as unknown[][]

        // each syntax definition generates a (value, set) (value coming from the definition itself, set from the nodes in offset level)
        for (const syntaxDefinition of restriction.syntaxes) {
          // access nodes' value based on accessor (syntaxDefinition.key)
          let nodeSet = [] as unknown[]

          if ([`syntax`, `symbol`, `type`].includes(syntaxDefinition.key)) {
            if (syntaxDefinition.key === `type`) nodeSet = nodes.map(node => ({ node, value: node.syntax.type }))
            else if (syntaxDefinition.key === `syntax`) nodeSet = nodes.map(node => ({ node, value: node.syntax.name }))
            else if (syntaxDefinition.key === `symbol`) nodeSet = nodes.map(node => ({ node, value: node.__syntaxSymbolKey }))
            else {
              // ERROR: Unimplemented syntax definition key
              debugger
            }
          } else if (syntaxDefinition.key === `tags`) {
            nodeSet = nodes.map(node => {
              const syntaxSymbol = node.syntax.symbols.find(symbol => symbol.key === node.syntaxSymbol!)
              const tags = uniq([...node.syntax.tags, ...(syntaxSymbol?.tags ?? [])])

              return { node, value: tags }
            })
          } else {
            // ERROR: Unimplemented syntax definition key
            debugger
          }

          // store tuple (value, nodeSet)
          values.push(syntaxDefinition.value)
          nodeSets.push(nodeSet)
        }

        // 2. compare value(s) against set(s)
        for (let i = 0; i < values.length; i++) {
          const value = values[i]
          const nodeSet = nodeSets[i]

          const set = nodeSet.map(({ value }) => value)

          const isValid = compare.compareValueAgainstSet(value, set, restriction.comparison)
          if (!isValid) invalidRestrictions.push({ restriction, hierarchicalOffset: offset })
        }
      }
    }

    // if (!valid) debugger

    return { valid: invalidRestrictions.length === 0, invalidRestrictions }
  }
}
