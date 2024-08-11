import { push } from "@december/utils"
// AST: Abstract Syntax Tree

import { identity, indexOf, isNil, isString, orderBy, uniq, uniqBy } from "lodash"
import Token from "../token"

import { v4 as uuidv4 } from "uuid"
import assert from "assert"
import Type from "../type/base"
import { ROOT } from "../type/declarations/structural"
import { Point, Range } from "@december/utils"
import { numberToLetters } from "../utils"

import SyntaxTree from "./tree"
import { isWrapper } from "../type/declarations/separator"

export const NODE_BALANCING = {
  UNBALANCED: `UNBALANCED`,
  BALANCED: `BALANCED`,
  NON_APPLICABLE: `NON_APPLICABLE`,
} as const

export type NodeBalancing = (typeof NODE_BALANCING)[keyof typeof NODE_BALANCING]

export class NodeNumber {
  level: number
  non_whitespace: number

  constructor() {
    this.reset()
  }

  reset() {
    this.level = -1
    this.non_whitespace = -1
  }
}

export default class Node {
  public id: string = uuidv4()
  //
  /**
   * MULTIPLE TOKENS
   *
   * Multiple tokens per node are only a thing for wrapper separators (at least for now)
   */
  private _tokens: Token[]
  private _type: Type | null
  public _range: Range // this is only returned in "get range()" if node is tokenless AND childless

  public get tokens() {
    return this._tokens
  }

  public get attributes() {
    // TODO: Implement for multiple tokens
    if (this._tokens.length > 1) debugger

    return this._tokens[0].attributes
  }

  public get balancing(): NodeBalancing {
    // node is only balanced/unbalanced if its type is wrapper separator AND it lacks 2 tokens
    if (isWrapper(this.type)) return this._tokens.length === 1 ? NODE_BALANCING.UNBALANCED : NODE_BALANCING.BALANCED

    return NODE_BALANCING.NON_APPLICABLE
  }

  public get type(): Type {
    assert(this._type || this._tokens.length > 0, `Node has no type or token`)

    if (this._type) return this._type

    const tokens = this._tokens.map(token => token?.type).filter(type => !isNil(type))
    const uniqueTokens = uniqBy(tokens, token => token.name)

    assert(uniqueTokens.length > 0, `Node has multiple token types`)

    return uniqueTokens[0]
  }

  private _children: Node[] = []
  public get children() {
    return this._children
  }

  get root() {
    const root = this.parent ? this.parent.root : this

    assert(root.type.name === `root`, `Root node not found`)

    return root
  }

  private _parent: Node | null = null
  public get parent() {
    return this._parent
  }

  private _index: number = -1
  public get index() {
    return this._index
  }

  public number: NodeNumber = new NodeNumber()

  public get level(): number {
    return this.parent ? this.parent.level + 1 : 0
  }

  public get height() {
    return this.children.reduce((acc, child) => Math.max(acc, child.height), 0) + 1
  }

  public get name() {
    if (this.type.name === `root`) return `root`

    const number = this.number.level === -1 ? `${this.index === -1 ? `` : this.index}*` : numberToLetters(this.number.level)

    return `${this.type.prefix}${this.level}.${number}`
  }

  public get lexeme() {
    if (this.tokens.length === 0 && this.children.length === 0) return ``

    if (this.tokens.length === 0) return this.children.map(child => child.lexeme()).join(``)

    return this._tokens[0].lexeme
  }

  public get content(): string {
    // TODO: Implement for tokenless and childless nodes
    if (this._tokens.length === 0 && this.children.length === 0) debugger

    const tokens: string[] = []

    if (this.children.length === 0) tokens.push(...this.children.map(child => child.content))

    this.traverse((node, token) => {
      if (token === null) return
      else if (token === undefined) tokens.push(node.content)
      else tokens.push(token.lexeme)
    })

    // TODO: Implement for > 2 tokens
    if (this._tokens.length > 2) debugger

    return tokens.join(``)
  }

  public get range(): Range {
    if (this.type.name === `root`) return this._range

    if (this._tokens.length === 0 && this.children.length === 0) return this._range

    if (this.children.length === 0) return new Range(...this.tokens.map(token => token.interval))

    const range = new Range()

    this.traverse((node, token) => {
      if (token === null) return
      else if (token === undefined) range.addEntry(...node.range.getEntries())
      else range.addEntry(token.interval)
    })

    return range
  }

  public get path(): string[] {
    return this.parent ? [...this.parent.path, this.name] : [`root`]
  }

  constructor(type: Type, range: Range)
  constructor(token: Token, range?: Range)
  constructor(tokenOrType: Token | Type, range?: Range) {
    this._tokens = tokenOrType instanceof Token ? [tokenOrType] : []
    this._type = tokenOrType instanceof Type ? tokenOrType : null

    if (tokenOrType instanceof Type && range) this._range = range
  }

  static Root(range: Range) {
    return new Node(ROOT, range)
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

  _updateNumbers(level: number) {
    assert(this.type.name === `root`, `Only root can update numbers`)

    let lastLevel = -1
    let numbers: NodeNumber = new NodeNumber()

    const queue: Node[] = [this.root]

    while (queue.length) {
      let size = queue.length
      while (size) {
        const node = queue.shift()!

        if (node.level !== lastLevel) {
          lastLevel = node.level

          numbers.reset()
        }

        node.number.level = ++numbers.level
        if (node.type.name !== `whitespace` && node.type.name !== `nil`) node.number.non_whitespace = ++numbers.non_whitespace

        // gather all the children of node dequeued and enqueue them(left/right nodes)
        node.children.forEach(child => queue.push(child))

        size--
      }

      // nodes.push(levelNodes)
    }
  }

  _removeChild(node: Node) {
    const { index } = this._children.find(child => child.id === node.id) ?? { index: -1 }

    return this._removeChildAt(index)
  }

  _removeChildAt(index: number) {
    assert(index > -1, `Node not found in children`)
    assert(index < this._children.length, `Node not found in children`)

    const level = this.level

    // remove child
    const [node] = this._children.splice(index, 1)
    node._removeParent()

    // update indexes
    for (let i = index; i < this._children.length; i++) this._children[i]._index = i

    // update numbers
    this.root._updateNumbers(level)

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

    // update numbers
    this.root._updateNumbers(this.level)
  }

  _removeParent() {
    if (this._parent) {
      this._parent = null
      this._index = -1

      this.number.reset()
    }
  }

  _addToParent(parent: Node, index: number | null = null) {
    // first, remove from current parent
    if (this.parent) this.parent._removeChild(this)

    // add to new parent
    parent._addChild(this, index)
  }

  // #endregion

  findAncestor(predicate: (node: Node) => boolean | null): Node | null {
    let ancestor: Node | null = this

    while (ancestor) {
      const result = predicate(ancestor)
      if (result) return ancestor
      if (result === null) break

      ancestor = ancestor.parent
    }

    return null
  }

  find(name: string): Node | null
  find(predicate: (node: Node) => boolean): Node | null
  find(nameOrPredicate: string | ((node: Node) => boolean)): Node | null {
    if (isString(nameOrPredicate)) {
      const name = nameOrPredicate

      return this.find(node => node.name === name)
    }

    for (const child of this.children) {
      if (nameOrPredicate(child)) return child

      const found = child.find(nameOrPredicate)
      if (found) return found
    }

    return null
  }

  repr() {
    if (this._tokens.length > 0) {
      // TODO: Implement for multiple tokens
      if (this._tokens.length > 1) debugger

      return this._tokens[0].lexeme
    }
    if (this._type) return `{${this._type.name.toUpperCase()}}`
  }

  addToken(token: Token) {
    this._tokens.push(token)
  }

  tokenize(level?: number): { node: Node; token?: Token }[] {
    const list: { node: Node; token?: Token }[] = []

    this.traverse((node, token) => {
      if (token === null) return
      else if (token === undefined) list.push({ node })
      else list.push({ node, token })
    }, level)

    return list
  }

  /** Traverse sub tree from this.
   *
   * token === undefined -> no relevant token from node
   * token === null      -> ignore node token/content if applicable
   * token === Token     -> only consider this specific token from node
   */
  traverse(predicate: (node: Node, token?: Token | null) => void, maxLevel?: number) {
    if (this._tokens.length === 0 && this.children.length === 0) return predicate(this)

    const children = !isNil(maxLevel) && this.level >= maxLevel ? [] : this.children

    if (children.length === 0) return predicate(this)

    const { narity } = this.type.syntactical!

    if (narity === Infinity) {
      if (this.type.name === `list`) {
        if (this.children.length > 0) for (const child of children) child.traverse(predicate, maxLevel)
      } else if (isWrapper(this.type)) {
        if (this._tokens[0]) predicate(this, this._tokens[0])
        if (this.children.length > 0) for (const child of children) child.traverse(predicate, maxLevel)
        if (this._tokens[1]) predicate(this, this._tokens[1])
      } else {
        // ERROR: Never tested
        if (this._tokens.length > children.length + 1) debugger

        let i = 0
        for (i = 0; i < this._tokens.length; i++) {
          const child = children[i]

          if (!child) debugger
          child.traverse(predicate, maxLevel)

          const token = this._tokens[i]

          if (!token) debugger
          predicate(this, token)
        }

        const lastChild = children[i]
        // if (!lastChild) debugger
        if (lastChild) lastChild.traverse(predicate, maxLevel)
      }
    } else if (narity === 1) {
      // ERROR: Never tested
      if (this._tokens.length > 0) debugger

      predicate(this, null)
      children[0].traverse(predicate, maxLevel)
    } else if (narity === 2) {
      // WARN: Untested
      if (this._tokens.length === 0) debugger

      // TODO: How to position multiple tokens? A single token should be at center, thats ok
      if (this._tokens.length > 1) debugger

      const [left, right] = children

      left.traverse(predicate, maxLevel)
      predicate(this, this.tokens[0])
      right?.traverse(predicate, maxLevel)
    } else throw new Error(`Unsupported n-arity "${narity}" when printing node text`)
  }
}

export interface FlatFullNode {
  type: `node`
  node: Node
}

export interface FlatPartialNode {
  type: `partial`
  node: Node
  range: Range
  token: Token
}

export type FlatNode = FlatFullNode | FlatPartialNode
