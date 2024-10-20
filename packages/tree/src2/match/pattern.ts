import { BasePattern, BasePatternMatch, BasePatternOptions, PatternMatchInfo, SubPatternPatternMatchInfo } from "@december/utils/match/base"
import { ElementPattern } from "@december/utils/match/element"
import { SetPattern } from "@december/utils/match/set"

import type Node from "../node"

import { TypeName } from "../type/declarations/name"

import assert from "assert"
import { ancestry, inContext, preOrder } from "../node/traversal"
import { TypeID, TypeModule } from "../type/base"
import { Scope } from "../node/scope/types"
import { MaybeUndefined, Nullable } from "tsdef"

// #region Node Patterns

export interface BaseNodePatternOptions extends BasePatternOptions {
  bypass?: BaseNodePattern
}

export interface BaseNodePatternMatch extends BasePatternMatch {
  isBypass: boolean
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

  override match(node: Node): BaseNodePatternMatch {
    const superMatch = super.match(node)
    return {
      ...superMatch,
      isBypass: !!this.bypass,
    }
  }

  override _match(node: Node): PatternMatchInfo {
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

  override _match(node: Node): SubPatternPatternMatchInfo {
    const patternMatch = this.pattern.match(node.type.name)
    return { isMatch: patternMatch.isMatch, patternMatch }
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

  override _match(node: Node): SubPatternPatternMatchInfo {
    const patternMatch = this.pattern.match(this.getValue(node))
    return { isMatch: patternMatch.isMatch, patternMatch }
  }
}

export class NodeCollectionPattern extends BaseNodePattern {
  declare type: `node:type:module`
  declare pattern: SetPattern<(string | number | boolean)[]>

  constructor(type: `node:type:module`, pattern: SetPattern<(string | number | boolean)[]>, options: Partial<BaseNodePatternOptions> = {}) {
    super(type, pattern, options)
  }

  getValue(node: Node): (string | number | boolean)[] {
    if (this.type === `node:type:module`) return node.type.modules

    assert(false, `Unimplemented node pattern value evaluation for "${this.type}"`)
  }

  override _match(node: Node): SubPatternPatternMatchInfo {
    const patternMatch = this.pattern.match(this.getValue(node))
    return { isMatch: patternMatch.isMatch, patternMatch }
  }
}

export class NodeScopePattern extends BaseNodePattern {
  declare type: `node:scope`
  declare pattern: SetPattern<Scope[]>

  constructor(pattern: SetPattern<Scope[]>, options: Partial<BaseNodePatternOptions> = {}) {
    super(`node:scope`, pattern, options)
  }

  override _match(node: Node): SubPatternPatternMatchInfo {
    const patternMatch = this.pattern.match(node.getScope())
    return { isMatch: patternMatch.isMatch, patternMatch }
  }
}

export type NodePattern = NodeTypeNamePattern | NodePrimitivePattern | NodeScopePattern | NodeCollectionPattern

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

export interface TargetTreePatternMatchInfo extends PatternMatchInfo {
  target: Nullable<Node>
  patternMatch: MaybeUndefined<BasePatternMatch>
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

  override _match(node: Node): TargetTreePatternMatchInfo {
    const target = this.target(node)
    const patternMatch = target ? this.pattern.match(target) : undefined

    return {
      isMatch: !!target && !!patternMatch?.isMatch,
      target,
      patternMatch,
    }
  }
}

export interface TraversalTreePatternMatchInfo extends PatternMatchInfo {
  target: MaybeUndefined<Node>
  patternMatch: MaybeUndefined<BasePatternMatch>
}

export class TraversalTreePattern extends BaseTreePattern {
  direction: `ancestry` | `offspring` | `in-context`

  constructor(type: string, direction: `ancestry` | `offspring` | `in-context`, pattern: NodePattern, options: Partial<BaseTreePatternOptions> = {}) {
    super(type, pattern, options)
    this.direction = direction
  }

  override _match(node: Node): TraversalTreePatternMatchInfo {
    let result: Nullable<{
      node: Node
      match: BaseNodePatternMatch
    }> = null

    this.traversal(node, node => {
      const match = this.pattern.match(node)
      if (match.isMatch) result = { node, match }
    })

    if (result !== null) assert((result as any).match.isMatch, `How the fuc`)

    return {
      isMatch: result !== null,
      target: (result as any)?.node,
      patternMatch: (result as any)?.match,
    }
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
  ID: (pattern: ElementPattern<TypeID>): NodePrimitivePattern => new NodePrimitivePattern(`node:type:id`, pattern),
  FULL: (pattern: ElementPattern<string>): NodePrimitivePattern => new NodePrimitivePattern(`node:type:full`, pattern),
  MODULE: (pattern: SetPattern<TypeModule[]>): NodeCollectionPattern => new NodeCollectionPattern(`node:type:module`, pattern),
}

export const NODE = {
  CONTENT: (pattern: ElementPattern<string | number | boolean>): NodePrimitivePattern => new NodePrimitivePattern(`node:content`, pattern),
  SCOPE: (pattern: SetPattern<Scope[]>): NodeScopePattern => new NodeScopePattern(pattern),
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
