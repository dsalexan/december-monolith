/**
 * LEXER
 *
 * tokenizer => expression -> words (no really tokens, since tokens require type)
 * scanner => words -> tokens
 * evaluator => evaluate(tokens) (finish setting tokens)
 */

import { isArray, isNil } from "lodash"
import { Match } from "@december/utils"
import type Type from "../base"
import { EvaluateFunction } from "../../phases/lexer/evaluation"
import assert from "assert"
import Node from "../../node"
import { SingleResult } from "../../node/search"

export function SemanticalRuleAdder(this: Type, priority: number, match: null | SemanticalMatch = null, reorganize: null | SemanticalReorganize = null) {
  this.semantical = new SemanticalRule()

  this.semantical.priority = priority
  this.semantical.match = match
  this.semantical.reorganize = reorganize

  return this
}

export function SemanticalRuleDeriver(this: Type, match: null | SemanticalMatch = null, reorganize: null | SemanticalReorganize = null, { priority }: Partial<SemanticalRule> = {}) {
  this.semantical = new SemanticalRule()

  assert(this.lexical, `deriveSemantical requires LexicalRule to derive from`)

  this.addSemantical(priority ?? this.lexical?.priority ?? this.syntactical?.priority, match, reorganize)

  return this
}

export type SemanticalMatch = (parent: Node, children: Node[]) => boolean | Record<string, SingleResult>
export type SemanticalReorganize = (parent: Node, children: Node[], match: ReturnType<SemanticalMatch>, tracking: OriginalChildrenTracking) => Node[] | null

export default class SemanticalRule {
  public priority: number
  public match: null | SemanticalMatch
  public reorganize: null | SemanticalReorganize
}

export type ReorganizationStatus = null | `pass-through` | `reorganized`

export class OriginalChildrenTracking {
  originalChildren: Node[]
  nodes: { index: number; node: Node; status: ReorganizationStatus }[] = []

  _validation: {
    noChildWasChanged: boolean
    allChildrenWereChanged: boolean
    onlySomeChildrenWereChanged: boolean
  }

  constructor(originalChildren: Node[]) {
    this.originalChildren = originalChildren
    this.nodes = [...originalChildren].map((child, index) => ({ index, node: child, status: null }))
  }

  update(node: Node, status: ReorganizationStatus) {
    const index = this.nodes.findIndex(({ node: child }) => child.id === node.id)

    if (index === -1) return

    const oldStatus = this.nodes[index].status

    // only update status if it is not a "reorganized"
    if (oldStatus === `reorganized`) return

    this.nodes[index].status = status
  }

  validate() {
    const noChildWasChanged = this.nodes.every(({ status }) => isNil(status))
    const allChildrenWereChanged = this.nodes.every(({ status }) => !isNil(status))
    const onlySomeChildrenWereChanged = !allChildrenWereChanged && this.nodes.some(({ status }) => !isNil(status))

    this._validation = {
      noChildWasChanged,
      allChildrenWereChanged,
      onlySomeChildrenWereChanged,
    }

    if (allChildrenWereChanged || noChildWasChanged) return true
    if (onlySomeChildrenWereChanged) return false

    return true
  }

  doUpdateChildren() {
    return this.nodes.some(({ status }) => !isNil(status))
  }
}
