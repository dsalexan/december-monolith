import Type from "../../type/base"
import SyntacticalRule from "../../type/rules/syntactical"
import { Node } from "./base"

export const NODE_BALANCING = {
  UNBALANCED: -1,
  NON_APPLICABLE: 0,
  BALANCED: 1,
  EXACTLY_BALANCED: 2,
} as const

export type NodeBalancing = (typeof NODE_BALANCING)[keyof typeof NODE_BALANCING]

export function setType(this: Node, type: Type) {
  this._type = type

  return this
}

export function balancing(this: Node): NodeBalancing {
  // node is only balanced/unbalanced if its type is wrapper separator AND it lacks 2 tokens
  if (this.attributes.unbalanced) return NODE_BALANCING.UNBALANCED
  else if (this.type.modules.includes(`wrapper`)) return this._tokens.length === 1 ? NODE_BALANCING.UNBALANCED : NODE_BALANCING.BALANCED
  else if (this.type.syntactical!.arity !== Infinity && !this.type.syntactical!.incompleteArity) return this.children.length !== this.type.syntactical!.arity ? NODE_BALANCING.UNBALANCED : NODE_BALANCING.BALANCED

  return NODE_BALANCING.NON_APPLICABLE
}

/** Compares priority between two nodes. -1: this < other; 1: other < this */
export function comparePriority(this: Node, other: Node, rule: `lexical` | `syntactical`): 1 | 0 | -1 {
  const A = this.type[rule]
  const B = other.type[rule]

  const type = this.type.comparePriority(other.type, rule)

  if (this.type.id === `operator` && other.type.id === `operator` && rule === `syntactical`) {
    /**
     * OPERATOR PRIORITY CONCERNS
     * × or ÷ > + or -
     * smaller arity > bigger arity
     * 1st operator > 2nd operator
     */

    const { arity: AArity } = A as SyntacticalRule
    const { arity: BArity } = B as SyntacticalRule

    return type || compare(AArity, BArity) || compare(this.index, other.index)
  }

  return type
}

function compare(a: number, b: number) {
  if (a < b) return -1
  if (a > b) return 1

  return 0
}
