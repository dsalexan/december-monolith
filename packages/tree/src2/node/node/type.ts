import Type from "../../type/base"
import { Node } from "./base"

export const NODE_BALANCING = {
  UNBALANCED: -1,
  NON_APPLICABLE: 0,
  BALANCED: 1,
} as const

export type NodeBalancing = (typeof NODE_BALANCING)[keyof typeof NODE_BALANCING]

export function setType(this: Node, type: Type) {
  this._type = type
}

export function balancing(this: Node): NodeBalancing {
  // node is only balanced/unbalanced if its type is wrapper separator AND it lacks 2 tokens
  if (this.type.modules.includes(`wrapper`)) return this._tokens.length === 1 ? NODE_BALANCING.UNBALANCED : NODE_BALANCING.BALANCED
  else if (this.type.syntactical.arity !== Infinity && !this.type.syntactical.incompleteArity) return this.children.length !== this.type.syntactical.arity ? NODE_BALANCING.UNBALANCED : NODE_BALANCING.BALANCED

  return NODE_BALANCING.NON_APPLICABLE
}
