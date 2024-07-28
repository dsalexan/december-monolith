// AST: Abstract Syntax Tree

import { identity, indexOf, orderBy } from "lodash"
import Token from "../token"

import { v4 as uuidv4 } from "uuid"
import assert from "assert"
import Type from "../type/base"
import { ROOT } from "../type/declarations/structural"
import Range from "../../../utils/src/range"
import { numberToLetters } from "../utils"

export default class Node {
  public id: string = uuidv4()
  //
  private _token: Token | null
  private _type: Type | null

  public get type(): Type {
    assert(this._type || this._token, `Node has no type or token`)

    return (this._type ?? this._token?.type)!
  }

  private _children: Node[] = []
  public get children() {
    return this._children
  }

  private _parent: Node | null = null
  public get parent() {
    return this._parent
  }

  private _index: number = -1
  public get index() {
    return this._index
  }

  public get level() {
    return this.parent ? this.parent.level + 1 : 0
  }

  public get height() {
    return this.children.reduce((acc, child) => Math.max(acc, child.height), 0) + 1
  }

  public get name() {
    if (this.type.name === `root`) return `root`

    return `${this.type.prefix}${this.level}.${numberToLetters(this.index)}`
  }

  public get lexeme() {
    // TODO: Implement for tokenless and childless nodes
    if (!this._token && this.children.length === 0) debugger

    if (!this._token) return this.children.map(child => child.lexeme).join(``)

    return this._token!.lexeme
  }

  public get range(): Range {
    // TODO: Implement for tokenless and childless nodes
    if (!this._token && this.children.length === 0) debugger

    if (this.children.length === 0) return this._token!.range

    return Range.merge(...this.children.map(child => child.range))
  }

  public get text() {
    // TODO: Implement for tokenless and childless nodes
    if (!this._token && this.children.length === 0) debugger

    if (this.children.length === 0) return this._token!.lexeme

    const lexemes: string[] = []

    const { narity } = this.type.syntactical!

    if (narity === Infinity) {
      for (const [i, child] of this.children.entries()) {
        if (i > 0 && this._token) lexemes.push(this._token!.lexeme)

        lexemes.push(child.text)
      }
    } else if (narity === 1) {
      // ERROR: Never tested
      if (this._token) debugger

      lexemes.push(...this.children.map(child => child.text))
    } else if (narity === 2) {
      // WARN: Untested
      if (!this._token) debugger

      lexemes.push(this.children[0].text)
      lexemes.push(this._token!.lexeme)
      lexemes.push(this.children[1].text)
    } else throw new Error(`Unsupported n-arity "${narity}" when printing node text`)

    return lexemes.join(``)
  }

  constructor(tokenOrType: Token | Type) {
    this._token = tokenOrType instanceof Token ? tokenOrType : null
    this._type = tokenOrType instanceof Type ? tokenOrType : null
  }

  static Root() {
    return new Node(ROOT)
  }

  // #region Proxy

  //    #region Type

  public get lexical() {
    return this.type.lexical
  }

  public get syntactical() {
    return this.type.syntactical
  }

  //    #endregion

  // #endregion

  // #region Hierarchy

  _removeChild(node: Node) {
    const { index } = this._children.find(child => child.id === node.id) ?? { index: -1 }

    return this._removeChildAt(index)
  }

  _removeChildAt(index: number) {
    assert(index > -1, `Node not found in children`)
    assert(index < this._children.length, `Node not found in children`)

    // remove child
    const [node] = this._children.splice(index, 1)
    node._removeParent()

    // update indexes
    for (let i = index; i < this._children.length; i++) this._children[i]._index = i

    return node
  }

  _addChild(node: Node, index: number | null = null) {
    // determine index
    if (index === null) index = this._children.length

    // add to list
    this._children.splice(index, 0, node)
    node._parent = this

    // update indexes
    for (let i = index; i < this._children.length; i++) this._children[i]._index = i
  }

  _removeParent() {
    if (this._parent) {
      this._parent = null
      this._index = -1
    }
  }

  _addToParent(parent: Node, index: number | null = null) {
    // first, remove from current parent
    if (this.parent) this.parent._removeChild(this)

    // add to new parent
    parent._addChild(this, index)
  }

  // #endregion

  repr() {
    if (this._token) return this._token.lexeme
    if (this._type) return `{${this._type.name.toUpperCase()}}`
  }

  /** Flattens a node to print in-order (some nodes could have a custom range) */
  flatten(): { node: Node; range?: Range }[] {
    // TODO: Implement for tokenless and childless nodes
    if (!this._token && this.children.length === 0) debugger

    if (this.children.length === 0) return [{ node: this }]

    const nodes: { node: Node; range?: Range }[] = []

    const { narity } = this.type.syntactical!

    if (narity === Infinity) {
      for (const [i, child] of this.children.entries()) {
        if (i > 0 && this._token) {
          const previous = this.children[nodes.length - 1]

          const [diff] = Range.difference(previous.range, child.range)

          // WARN: Untested
          if (!diff.isRange) debugger

          debugger
          nodes.push({ node: this, range: diff })
        }

        nodes.push(...child.flatten())
      }
    } else if (narity === 1) {
      // ERROR: Never tested
      if (this._token) debugger

      nodes.push(...this.children[0].flatten())
    } else if (narity === 2) {
      // WARN: Untested
      if (!this._token) debugger

      const [left, right] = this.children

      // get inner range between left and right
      const [diff] = Range.difference(left.range, right.range)

      // WARN: Untested
      if (!diff.isRange) debugger

      nodes.push(...left.flatten())
      nodes.push({ node: this, range: diff })
      nodes.push(...right.flatten())
    } else throw new Error(`Unsupported n-arity "${narity}" when printing node text`)

    return nodes
  }
}
