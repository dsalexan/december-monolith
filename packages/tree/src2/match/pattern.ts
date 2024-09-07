import { offspring } from "./../nrs/rule_old/index"
import { BasePattern, BasePatternOptions } from "@december/utils/match/base"
import { ElementPattern } from "@december/utils/match/element"
import { SetPattern } from "@december/utils/match/set"

import type Node from "../node"

import { TypeName } from "../type/declarations/name"

import assert from "assert"
import { ancestry, inContext, preOrder } from "../node/traversal"

// #region Node Patterns

export interface BaseNodePatternOptions extends BasePatternOptions {
  bypass?: BaseNodePattern
}

export class BaseNodePattern extends BasePattern {
  pattern: BasePattern
  /**
   * A list of nodes to bypass while matching
   * "Bypassing" is to ignore the node by itself and check its children
   *    A. if node has no children, then don't bypass
   *    B. if node has only one child, then consider the child as the node for matching purporses
   *    C. if node has multiple children, then what?
   */
  bypass?: BaseNodePattern

  constructor(type: string, pattern: BasePattern, options: Partial<BaseNodePatternOptions> = {}) {
    super(type, options)
    this.pattern = pattern
    if (options.bypass) this.bypass = options.bypass
  }

  override _match(node: Node): boolean {
    throw new Error(`Unimplemented _match for node pattern`)
  }

  override _prepare(node: Node): Node {
    return this.bypassNode(node)
  }

  bypassNode(node: Node): Node {
    if (!this.bypass) return node

    const children = node.children

    const shouldBypass = this.bypass.match(node)
    if (!shouldBypass) return node
    if (children.length === 0) return node

    assert(children.length === 1, `Unimplemented multiple children bypassing`)

    return children[0]
  }
}

export class NodeTypeNamePattern extends BaseNodePattern {
  declare type: `node:type:name`
  declare pattern: ElementPattern<TypeName>

  constructor(pattern: ElementPattern<TypeName>, options: Partial<BaseNodePatternOptions> = {}) {
    super(`type:name`, pattern, options)
  }

  override _match(node: Node): boolean {
    return this.pattern.match(node.type.name)
  }
}

export class NodePrimitivePattern extends BaseNodePattern {
  declare type: `node:type:id` | `node:type:full` | `node:content`
  declare pattern: ElementPattern<string | number | boolean>

  constructor(type: `node:type:id` | `node:type:full` | `node:content`, pattern: ElementPattern<string | number | boolean>, options: Partial<BaseNodePatternOptions> = {}) {
    super(type, pattern, options)
  }

  getValue(node: Node): string | number | boolean {
    if (this.type === `node:type:id`) return node.type.id
    else if (this.type === `node:type:full`) return node.type.getFullName()
    else if (this.type === `node:content`) return node.content!

    assert(false, `Unimplemented node pattern value evaluation for "${this.type}"`)
  }

  override _match(node: Node): boolean {
    return this.pattern.match(this.getValue(node))
  }
}

export class NodeScopePattern extends BaseNodePattern {
  declare type: `node:scope`
  declare pattern: SetPattern<string[]>

  constructor(pattern: SetPattern<string[]>, options: Partial<BaseNodePatternOptions> = {}) {
    super(`node:scope`, pattern, options)
  }

  override _match(node: Node): boolean {
    return this.pattern.match(node.scope)
  }
}

export type NodePattern = NodeTypeNamePattern | NodePrimitivePattern | NodeScopePattern

// #endregion

// #region Tree Patterns

export interface BaseTreePatternOptions extends BasePatternOptions {}

export class BaseTreePattern extends BasePattern {
  pattern: NodePattern

  constructor(type: string, pattern: NodePattern, options: Partial<BaseTreePatternOptions> = {}) {
    super(type, options)
    this.pattern = pattern
  }
}

export class TargetTreePattern extends BaseTreePattern {
  _target: `parent`

  constructor(type: string, target: `parent`, pattern: NodePattern, options: Partial<BaseTreePatternOptions> = {}) {
    super(type, pattern, options)
    this._target = target
  }

  public target(node: Node) {
    if (this._target === `parent`) return node.parent

    throw new Error(`Unimplemented tree pattern target "${this._target}"`)
  }

  override _match(node: Node): boolean {
    const target = this.target(node)

    return !!target && this.pattern.match(target)
  }
}

export class TraversalTreePattern extends BaseTreePattern {
  direction: `ancestry` | `offspring` | `in-context`

  constructor(type: string, direction: `ancestry` | `offspring` | `in-context`, pattern: NodePattern, options: Partial<BaseTreePatternOptions> = {}) {
    super(type, pattern, options)
    this.direction = direction
  }

  override _match(node: Node): boolean {
    let result = false

    const traversal = this.traversal

    traversal(node, node => {
      if (this.pattern.match(node)) result = true
    })

    return result
  }

  public get traversal() {
    if (this.direction === `ancestry`) return ancestry
    else if (this.direction === `offspring`) return preOrder
    else if (this.direction === `in-context`) return inContext

    throw new Error(`Unimplemented tree pattern traversal direction "${this.direction}"`)
  }
}

export type TreePattern = TraversalTreePattern | TargetTreePattern

// #endregion

// #region Proxies

export const TYPE = {
  NAME: (pattern: ElementPattern<TypeName>): NodeTypeNamePattern => new NodeTypeNamePattern(pattern),
  ID: (pattern: ElementPattern<string>): NodePrimitivePattern => new NodePrimitivePattern(`node:type:id`, pattern),
  FULL: (pattern: ElementPattern<string>): NodePrimitivePattern => new NodePrimitivePattern(`node:type:full`, pattern),
}

export const NODE = {
  CONTENT: (pattern: ElementPattern<string | number | boolean>): NodePrimitivePattern => new NodePrimitivePattern(`node:content`, pattern),
  SCOPE: (pattern: SetPattern<string[]>): NodeScopePattern => new NodeScopePattern(pattern),
}

export const TREE = {
  ANCESTOR: (pattern: NodePattern): TraversalTreePattern => new TraversalTreePattern(`tree:ancestor`, `ancestry`, pattern),
  OFFSPRING: (pattern: NodePattern): TraversalTreePattern => new TraversalTreePattern(`tree:offspring`, `offspring`, pattern),
  IN_CONTEXT: (pattern: NodePattern): TraversalTreePattern => new TraversalTreePattern(`tree:in-context`, `in-context`, pattern),
  PARENT: (pattern: NodePattern): TargetTreePattern => new TargetTreePattern(`tree:parent`, `parent`, pattern),
}

// #endregion

export function isNodePattern(pattern: BasePattern): pattern is NodePattern {
  return pattern.type.startsWith(`node:`)
}

export function isTreePattern(pattern: BasePattern): pattern is TreePattern {
  return pattern.type.startsWith(`tree:`)
}
