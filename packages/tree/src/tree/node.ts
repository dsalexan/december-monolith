import { Nullable } from "tsdef"
import { isNil } from "lodash"
import assert from "assert"

import uuid from "@december/utils/uuid"
import { numberToLetters } from "@december/utils"

import { isLiteral } from "../utils/guards"
import { NODE_TYPE_PREFIX, NodeType } from "./type"
import { Block } from "../logger"
import { print } from "./printer"
import { Token } from "../token/core"

export interface NodeOptions {}

export class Node {
  public id: string = uuid()
  public type: NodeType

  constructor() {}

  static isNode(node: any): node is Node {
    return node instanceof Node
  }

  public clone(): Node {
    throw new Error(`Method not implemented for type "${this.type}".`)
  }

  // #region PARENT/CHILDREN

  public parent: Nullable<Node> = null
  public index: Nullable<number> = null
  public label: Nullable<string> = null
  public children: Node[] = []

  public setParent(parent: Node, index: number, label: string) {
    this.parent = parent
    this.index = index
    this.label = label
  }

  public addChild(child: Node, index: number, label: string): this {
    this.children.splice(index, 0, child)
    child.setParent(this, index, label)

    return this
  }

  public replaceChild(child: Node, index: number): this {
    const oldChild = this.children[index]
    assert(oldChild, `Child at index ${index} does not exist.`)

    const label = oldChild.label
    assert(label, `Child at index ${index} lacks a label.`)

    // @ts-ignore
    oldChild.setParent(null, null, null)

    this.children[index] = child
    child.setParent(this, index, label)

    return this
  }

  public static swap(a: Node, b: Node): void {
    const parentA = a.parent
    const indexA = a.index
    const labelA = a.label

    const parentB = b.parent
    const indexB = b.index
    const labelB = b.label

    parentA!.children[indexA!] = b
    parentB!.children[indexB!] = a

    a.setParent(parentB!, indexB!, labelB!)
    b.setParent(parentA!, indexA!, labelA!)
  }

  public swapChildren(indexA: number, indexB: number): this {
    Node.swap(this.children[indexA], this.children[indexB])

    return this
  }

  // #endregion

  // #region TREE
  public get level() {
    return this.parent ? this.parent.level + 1 : 0
  }

  public get letter() {
    return !isNil(this.index) ? numberToLetters(this.index) : ``
  }

  public get letters() {
    return this.parent ? this.parent.letters + this.letter : this.letter
  }

  public get name() {
    const prefix = NODE_TYPE_PREFIX[this.type] ?? this.type.replace(/[^A-Z]+/g, ``).toLowerCase()
    const letters = this.parent ? `.` + this.letters : ``
    return `${prefix}${this.level}${letters}`
  }

  public getSignature(): string {
    return `${this.type}::${this.getContent()}`
  }

  public isSimilar(other: Node): boolean {
    const signature = this.getSignature()
    const otherSignature = other.getSignature()
    return signature === otherSignature
  }

  // #endregion

  // #region TOKENS
  public tokens: Token[] = []

  public getContent({ depth, separator, wrap }: { depth?: number; separator?: string; wrap?: boolean } = {}): string {
    // if (this.type === `ExpressionStatement`) debugger

    depth ??= 0

    // 1. First concatenate all tokens (return it if there are no children)
    const tokenContent = this.tokens.map(value => value.content).join(``)
    if (this.children.length === 0) return tokenContent

    // 2. Check if we CAN (not should) wrap content in something
    let canWrap = wrap ?? true

    // 3. Ask for children contents
    const childrenContent = this.children.map(child => child.getContent({ depth: depth! + 1, separator, wrap }))
    const content = [...childrenContent]

    // 4. By default inject content from tokens after first child
    if (tokenContent.length > 0) content.splice(1, 0, tokenContent)

    // 5. Check if we SHOULD wrap content
    let shouldWrap = canWrap
    if (canWrap) {
      //    A) Node with only one child SHOULD NOT be wrapper
      shouldWrap = shouldWrap && this.children.length > 1
      //    B) Not without parents SHOULD NOT be wrapped
      shouldWrap = shouldWrap && this.parent !== null
      //    C) Node without siblings SHOULD NOT be wrapped
      shouldWrap = shouldWrap && this.parent !== null && this.parent.children.length > 1
      //    D) First node printed SHOULD NOT be wrapped
      shouldWrap = shouldWrap && depth > 0
    }

    const [opener, closer] = shouldWrap ? [`(`, `)`] : [``, ``]
    return `${opener}${content.join(separator ?? ` `)}${closer}`
  }

  public toString(): string {
    return this.getContent()
  }

  // #endregion

  // #region DEBUG

  public print() {
    return print(this)
  }

  public toBlocks(): Block[] {
    throw new Error(`Method not implemented for type "${this.type}".`)
  }

  public getDebug(): string {
    return this.getContent()
    // `<${this.name}>`
  }

  // #endregion

  // #region TRAVERSAL

  public static postOrder(node: Node, iteratee: (node: Node) => void) {
    for (const child of node.children) Node.postOrder(child, iteratee)
    iteratee(node)
  }

  // #endregion
}
