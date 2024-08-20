import { Match } from "@december/utils"
import Node from "../node"
import { TypeName } from "../type/declarations/name"
import assert from "assert"

// export type { ValuePattern } from "@december/utils/match/value"

export const NODE_TYPE_PATTERN_TARGET = [`type:id`, `type:name`, `type:full`] as const
export type NodeTypePatternTarget = (typeof NODE_TYPE_PATTERN_TARGET)[number]

export type NodePatternTarget = NodeTypePatternTarget

export interface BaseNodePattern {
  /**
   * A list of fullName types to bypass while match
   * "Bypassing" is to ignore the node by itself and check its children
   *    A. if node has no children, then don't bypass
   *    B. if node has only one child, then consider the child as the node for matching purporses
   *    C. if node has multiple children, then what?
   */
  bypass?: Match.Value.ValuePattern<string>
}

export interface NodeTypeNamePattern extends BaseNodePattern {
  target: `type:name`
  pattern: Match.Value.ValuePattern<TypeName>
}

export interface NodeTypePattern extends BaseNodePattern {
  target: `type:id` | `type:full`
  pattern: Match.Value.ValuePattern<string>
}

export type NodePattern = NodeTypeNamePattern | NodeTypePattern

// const p: NodePattern = {
//   target: `type:name`,
//   pattern: {
//     type: `equals`,
//     value: `ad`,
//   },
// }

export function _matchNode(node: Node, pattern: NodePattern): boolean {
  if (pattern.target === `type:id`) return Match.Value.matchValue(node.type.id, pattern.pattern)
  else if (pattern.target === `type:name`) return Match.Value.matchValue(node.type.name, pattern.pattern)
  else if (pattern.target === `type:full`) return Match.Value.matchValue(node.type.getFullName(), pattern.pattern)
  //
  else throw new Error(`Unimplemented node pattern target "${pattern.target}"`)
}

export function bypassNode(node: Node, pattern: BaseNodePattern): Node {
  if (!pattern.bypass) return node

  const children = node.children
  const type = node.type.getFullName()

  const shouldBypass = Match.Value.matchValue(type, pattern.bypass)
  if (!shouldBypass) return node
  if (children.length === 0) return node

  assert(children.length === 1, `Unimplemented multiple children bypassing`)

  return children[0]
}

export function matchNode(node: Node, pattern: NodePattern): boolean {
  const bypassed = bypassNode(node, pattern)

  return _matchNode(bypassed, pattern)
}
