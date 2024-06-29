import { cloneDeep, has, uniq } from "lodash"
import type { SyntaxNode } from "../../node"
import type { TreeParsingStage } from "../../parser"
import { compare } from "@december/utils"
import type { SyntaxName } from "../manager"

export { default as SyntaxRestrictionManager } from "./manager"
export type { SyntaxRestrictionMap } from "./manager"

type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>
type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export type TagSyntaxDefinition = { key: `tags`; value: string[] }
export type GenericSyntaxDefinition = {
  key: `syntax` | `symbol` | `type`
  value: string
  rule: `equal` | `not_equal`
}

export type SyntaxDefinition = TagSyntaxDefinition | GenericSyntaxDefinition
export type SyntaxDefinitionMap = AtLeastOne<Record<SyntaxDefinition[`key`], SyntaxDefinition[`value`]>>

// export type SyntaxRestrictionType = `all` | `some` | `none`

export type SyntaxHierarchicalTarget = `up2Generations` | `grandparent` | `parent` | `siblings` | `children` | `grandchildren` | `previous_sibling` | `next_sibling`

export interface SyntaxRestriction {
  stage: TreeParsingStage
  comparison: compare.OneToManyComparisonBlueprint
  syntaxes: SyntaxDefinition[] //  accessor for values to compare
  //
  // type: SyntaxRestrictionType
  /**
   * -n - grand^(n-1)-grandparent
   * -3 - grand-grandparent
   * -2 - grandparent
   * -1 - parent
   * 0 - siblings
   * 1 - children
   * 2 - grandchildren
   */
  hierarchicalOffset: number
}

export function makeSyntaxRestriction(stage: TreeParsingStage, comparison: compare.ComparisonBlueprint, ...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  const definitions: SyntaxDefinition[] = []
  for (const syntax of syntaxes) {
    if (typeof syntax === `string`) definitions.push({ key: `syntax`, value: syntax, rule: `equal` })
    else if (has(syntax, `key`)) definitions.push(syntax as SyntaxDefinition)
    else {
      const keys = Object.keys(syntax) as (keyof SyntaxDefinitionMap)[]

      for (const key of keys) {
        definitions.push({ key, value: syntax[key]! } as SyntaxDefinition)
      }
    }
  }

  return {
    stage,
    comparison,
    syntaxes: definitions,
  } as Omit<SyntaxRestriction, `hierarchicalOffset`>
}

export function getHierarchicalOffset(at: number | SyntaxHierarchicalTarget) {
  return (
    {
      up2Generations: -201,
      grandparent: -2,
      parent: -1,
      siblings: 0,
      children: 1,
      grandchildren: 2,
      //
      previous_sibling: -0.1,
      next_sibling: 0.1,
      // the integer in the decimal is the offset at sibling level
    }[at] ?? (at as number)
  )
}

export function getHierarchicalOffsetLabel(hierarchicalOffset: number) {
  return (
    {
      [-201]: `up-2-generations`,
      [-3]: `grand-grandparent`,
      [-2]: `grandparent`,
      [-1]: `parent`,
      [0]: `siblings`,
      [1]: `children`,
      [2]: `grandchildren`,
      [3]: `grand-grandchildren`,
      //
      [-0.1]: `previous sibling`,
      [0.1]: `next sibling`,
    }[hierarchicalOffset] ?? hierarchicalOffset
  )
}

export function getRestrictionReason(restriction: SyntaxRestriction) {
  const comparison = restriction.comparison as any
  let _comparison = comparison.arrayOperation ?? comparison.operation
  if (comparison.negation) _comparison = `!` + _comparison

  return `[${restriction.hierarchicalOffset}] ${_comparison} ${getHierarchicalOffsetLabel(restriction.hierarchicalOffset)}`
}
