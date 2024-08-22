import { BasePattern, BasePatternOptions } from "@december/utils/match/base"
import { ValuePattern } from "@december/utils/match/value"
import type Node from "../node"

import { TypeName } from "../type/declarations/name"

import assert from "assert"
import { ContainedInSetPattern, ContainsSetPattern, SetPattern } from "../../../utils/src/match/set"

export interface BaseNodePatternOptions extends BasePatternOptions {
  bypass?: BaseNodePattern
}

export class BaseNodePattern<TValue = string | number | boolean> extends BasePattern {
  pattern: ValuePattern<TValue> | SetPattern<TValue>
  /**
   * A list of nodes to bypass while matching
   * "Bypassing" is to ignore the node by itself and check its children
   *    A. if node has no children, then don't bypass
   *    B. if node has only one child, then consider the child as the node for matching purporses
   *    C. if node has multiple children, then what?
   */
  bypass?: BaseNodePattern

  constructor(type: string, pattern: ValuePattern<TValue> | SetPattern<TValue>, options: Partial<BaseNodePatternOptions> = {}) {
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

export class NodeTypeNamePattern extends BaseNodePattern<TypeName> {
  declare type: `node:type:name`
  declare pattern: ValuePattern<TypeName>

  constructor(pattern: ValuePattern<TypeName>, options: Partial<BaseNodePatternOptions> = {}) {
    super(`type:name`, pattern, options)
  }

  override _match(node: Node): boolean {
    return this.pattern.match(node.type.name)
  }
}

export class NodePrimitivePattern extends BaseNodePattern<string | number | boolean> {
  declare type: `node:type:id` | `node:type:full` | `node:lexeme`
  declare pattern: ValuePattern<string | number | boolean>

  constructor(type: `node:type:id` | `node:type:full` | `node:lexeme`, pattern: ValuePattern<string | number | boolean>, options: Partial<BaseNodePatternOptions> = {}) {
    super(type, pattern, options)
  }

  getValue(node: Node): string | number | boolean {
    if (this.type === `node:type:id`) return node.type.id
    else if (this.type === `node:type:full`) return node.type.getFullName()
    else if (this.type === `node:lexeme`) return node.lexeme

    assert(false, `Unimplemented node pattern value evaluation for "${this.type}"`)
  }

  override _match(node: Node): boolean {
    return this.pattern.match(this.getValue(node))
  }
}

export class NodeScopePattern extends BaseNodePattern {
  declare type: `node:scope`
  declare pattern: ContainsSetPattern<string>

  constructor(pattern: ContainsSetPattern<string>, options: Partial<BaseNodePatternOptions> = {}) {
    super(`node:scope`, pattern, options)
  }

  override _match(node: Node): boolean {
    return this.pattern.match(node._preCalculatedScope)
  }
}

export type NodePattern = NodeTypeNamePattern | NodePrimitivePattern | NodeScopePattern

// #region Proxies

export const TYPE = {
  NAME: (pattern: ValuePattern<TypeName>): NodeTypeNamePattern => new NodeTypeNamePattern(pattern),
  ID: (pattern: ValuePattern<string>): NodePrimitivePattern => new NodePrimitivePattern(`node:type:id`, pattern),
  FULL: (pattern: ValuePattern<string>): NodePrimitivePattern => new NodePrimitivePattern(`node:type:full`, pattern),
}

export const NODE = {
  LEXEME: (pattern: ValuePattern<string | number | boolean>): NodePrimitivePattern => new NodePrimitivePattern(`node:lexeme`, pattern),
  SCOPE: (pattern: ContainsSetPattern<string>): NodeScopePattern => new NodeScopePattern(pattern),
}

// #endregion

export function isNodePattern(pattern: BaseNodePattern): pattern is NodePattern {
  return pattern.type.startsWith(`node:`)
}
