import { push } from "@december/utils"
// AST: Abstract Syntax Tree

export * as Search from "./search"

import { cloneDeep, identity, indexOf, isArray, isNil, isString, orderBy, reverse, uniq, uniqBy } from "lodash"
import Token from "../token"

import { v4 as uuidv4 } from "uuid"
import assert from "assert"
import Type from "../type/base"
import { ROOT } from "../type/declarations/structural"
import { Point, Range } from "@december/utils"
import { numberToLetters } from "../utils"

import { isWrapper } from "../type/declarations/separator"

import { Attributes } from "./attributes"
import { inOrder } from "./traversal"
import { PolarCoordinates } from "mathjs"

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
  private _attributes: Attributes

  public get tokens() {
    return this._tokens
  }

  private _defaultAttributes() {
    this._attributes ??= {
      tags: [],
    }
  }

  public get attributes() {
    this._defaultAttributes()
    return this._attributes!
  }

  public setAttributes(attributes: Partial<Attributes>) {
    this._defaultAttributes()

    this._attributes = {
      ...this._attributes,
      ...attributes,
    }

    return this
  }

  public get tokenAttributes() {
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
  public setType(type: Type) {
    this._type = type
  }

  private _children: Node[] = []
  public get children() {
    return this._children
  }

  getChildren(maxDepth: number) {
    if (this.level >= maxDepth) return []
    return this.children
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

    if (this.tokens.length === 0) return this.children.map(child => child.lexeme).join(``)

    return this._tokens.map(token => token.lexeme).join(``)

    // return this._tokens[0].lexeme
  }

  /** Non-overflowable content */
  public get _content(): string | null {
    // TODO: Implement for tokenless and childless nodes that are not points
    if (this._tokens.length === 0 && this.children.length === 0 && !this._range.columnIsPoint(`first`)) debugger

    if (this._tokens.length) return this._tokens.map(token => token.lexeme).join(``)

    return null
  }

  public get content(): string | null {
    if (this._tokens.length === 0 && this.children.length === 0) return null

    const strings: string[] = []

    const tokens = this.tokenize()
    for (const { node, token } of tokens) {
      if (token) strings.push(token.lexeme)
      else {
        const content = node._content
        if (content !== null) strings.push(content)
      }
    }
    // inOrder(this, (node, token) => {
    //   if (token === null) return
    //   else if (token === undefined) {
    //     const content = node._content
    //     if (content !== null) tokens.push(content)
    //   } else tokens.push(token.lexeme)
    // })

    return strings.join(``)
  }

  public get range(): Range {
    if (this.type.name === `root`) return this._range

    if (this._tokens.length === 0 && this.children.length === 0) return this._range

    if (this.children.length === 0) return new Range(...this.tokens.map(token => token.interval))

    const range = new Range()

    const tokens = this.tokenize()
    for (const { node, token } of tokens) range.addEntry(...(token ? [token.interval] : node.range.getEntries()))

    // inOrder(this, (node, token) => {
    //   if (token === null) return
    //   else if (token === undefined) range.addEntry(...node.range.getEntries())
    //   else range.addEntry(token.interval)
    // })

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

  _removeChild(node: Node, IGNORE_UPDATE_NUMBERS = false) {
    const { index } = this._children.find(child => child.id === node.id) ?? { index: -1 }

    return this._removeChildAt(index, IGNORE_UPDATE_NUMBERS)
  }

  _removeChildAt(index: number, IGNORE_UPDATE_NUMBERS = false) {
    assert(index > -1, `Node not found in children`)
    assert(index < this._children.length, `Node not found in children`)

    const level = this.level

    // remove child
    const [node] = this._children.splice(index, 1)
    node._removeParent(IGNORE_UPDATE_NUMBERS)

    // update indexes
    for (let i = index; i < this._children.length; i++) this._children[i]._index = i

    // update numbers
    if (!IGNORE_UPDATE_NUMBERS) this.root._updateNumbers(level, IGNORE_UPDATE_NUMBERS)

    return node
  }

  removeAllChildren(IGNORE_UPDATE_NUMBERS = false) {
    const children = reverse(this._children)
    for (const child of children) this._removeChild(child, IGNORE_UPDATE_NUMBERS)

    return reverse(children)
  }

  _addChild(node: Node, index: number | null = null, IGNORE_UPDATE_NUMBERS = false) {
    // determine index
    if (index === null) index = this._children.length

    // add to list
    this._children.splice(index, 0, node)
    node._parent = this

    // update indexes
    for (let i = index; i < this._children.length; i++) this._children[i]._index = i

    // update numbers
    if (!IGNORE_UPDATE_NUMBERS) this.root._updateNumbers(this.level)
  }

  _removeParent(IGNORE_UPDATE_NUMBERS = false) {
    if (this._parent) {
      this._parent = null
      this._index = -1

      this.number.reset()
    }
  }

  _addToParent(parent: Node, index: number | null = null, IGNORE_UPDATE_NUMBERS = false) {
    // first, remove from current parent
    if (this.parent) this.parent._removeChild(this, IGNORE_UPDATE_NUMBERS)

    // add to new parent
    parent._addChild(this, index, IGNORE_UPDATE_NUMBERS)

    return this
  }

  // #endregion

  /** Returns the nth ancestor of node */
  ancestor(offset: number = 0) {
    let ancestor: Node | null = this.parent

    while (ancestor && offset > 0) {
      ancestor = ancestor.parent
      offset--
    }

    return ancestor
  }

  /** Returns offspring at height N from node */
  offspring(offset: number): Node[] {
    const offspring: Node[] = []

    let queue: Node[] = [this]

    while (queue.length && offset > 0) {
      let size = queue.length
      while (size) {
        const node = queue.shift()!

        if (node.level === offset) offspring.push(node)
        else queue.push(...node.children)

        size--
      }

      offset--
    }

    // TODO: test this
    if (offspring.length >= 3) debugger

    return offspring
  }

  /** Returns the nth sibling of node */
  sibling(offset: number) {
    if (!this.parent) return null

    const _index = this.parent.children.findIndex(child => child.id === this.id)
    assert(this.index + offset !== _index, `Node internal index doesn't match it's position in parent.children[...]`)

    return this.parent.children[this.index + offset]
  }

  /** Translates to another node in tree */
  translate(offset: Partial<{ x: number; y: number }>) {
    const y = offset.y ?? 0
    const x = offset.x ?? 0

    const vertical = y === 0 ? this : y < 0 ? this.ancestor(y * -1) : this.offspring(y)[0]
    return vertical!.sibling(x)
  }

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
    let predicate: (node: Node) => boolean = nameOrPredicate as any
    if (isString(nameOrPredicate)) predicate = node => node.name === nameOrPredicate

    if (predicate(this)) return this

    for (const child of this.children) {
      const found = child.find(predicate)
      if (found) return found
    }

    return null
  }

  scope(predicate: (node: Node) => string[]) {
    const scopes: string[] = []

    let ancestor: Node | null = this

    while (ancestor) {
      const result = predicate(ancestor)

      for (const tag of result) if (!scopes.includes(tag)) scopes.push(tag)

      ancestor = ancestor.parent
    }

    return scopes
  }

  addToken(token: Token | Token[], index?: number) {
    const tokens = isArray(token) ? token : [token]
    this._tokens.splice(index ?? this._tokens.length, 0, ...tokens)
  }

  clearTokens() {
    this._tokens.splice(0, this._tokens.length)
  }

  tokenize(level?: number): { node: Node; token?: Token }[] {
    const list: { node: Node; token?: Token }[] = []

    inOrder(this, (node, token, ignorable) => !ignorable && list.push({ node, token: token || undefined }), level)

    return list
  }

  /** Traverse sub tree from this.
   *
   * token === undefined -> no relevant token from node
   * token === null      -> ignore node token/content if applicable
   * token === Token     -> only consider this specific token from node
   */
  traver1se(predicate: (node: Node, token?: Token | null) => void, maxLevel?: number) {
    if (this._tokens.length === 0 && this.children.length === 0) return predicate(this)

    const children = !isNil(maxLevel) && this.level >= maxLevel ? [] : this.children

    if (children.length === 0) return predicate(this)

    const { narity } = this.type.syntactical!

    if (narity === Infinity) {
      if (this.type.name === `list`) {
        if (this.children.length > 0) for (const child of children) child.traver1se(predicate, maxLevel)
      } else if (isWrapper(this.type)) {
        if (this._tokens[0]) predicate(this, this._tokens[0])
        if (this.children.length > 0) for (const child of children) child.traver1se(predicate, maxLevel)
        if (this._tokens[1]) predicate(this, this._tokens[1])
      } else {
        // ERROR: Never tested
        if (this._tokens.length > children.length + 1) debugger

        // for infinte narities, just intercalate tokens and children
        //    OR use traversalIndex (in token.attributes) if any

        const traversalList: (Node | Token)[] = [...children]

        let tokens: { token: Token; index: number }[] = []

        // first add "intercalation" tokens (those without traversal index)
        let cursor = 0
        for (const token of this._tokens) {
          if (token.attributes.traversalIndex !== undefined) continue
          tokens.push({ token, index: cursor++ })
        }

        let reverseSortedTokens = orderBy(tokens, ({ index }) => index, `desc`)
        for (const { token, index } of reverseSortedTokens) traversalList.splice(index, 0, token)

        // second add fixed traversal indexes
        tokens = []
        for (const token of this._tokens) {
          const index = token.attributes.traversalIndex
          if (index === undefined) continue

          tokens.push({ token, index: index >= 0 ? index : tokens.length + index })
        }

        reverseSortedTokens = orderBy(tokens, ({ index }) => index, `desc`)
        for (const { token, index } of reverseSortedTokens) traversalList.splice(index, 0, token)

        for (const entry of traversalList) {
          if (entry instanceof Token) predicate(this, entry)
          else entry.traver1se(predicate, maxLevel)
        }

        // let i = 0
        // for (i = 0; i < this._tokens.length; i++) {
        //   const child = children[i]

        //   if (!child) debugger
        //   child.traverse(predicate, maxLevel)

        //   const token = this._tokens[i]

        //   if (!token) debugger
        //   predicate(this, token)
        // }

        // const lastChild = children[i]
        // // if (!lastChild) debugger
        // if (lastChild) lastChild.traverse(predicate, maxLevel)
      }
    } else if (narity === 1) {
      // ERROR: Never tested
      if (this._tokens.length > 0) debugger

      predicate(this, null)
      children[0].traver1se(predicate, maxLevel)
    } else if (narity === 2) {
      // TODO: How to position multiple tokens? A single token should be at center, thats ok
      if (this._tokens.length > 1) debugger

      const [left, right] = children

      left.traver1se(predicate, maxLevel)
      if (this._tokens.length > 0) predicate(this, this.tokens[0])
      right?.traver1se(predicate, maxLevel)
    } else throw new Error(`Unsupported n-arity "${narity}" when printing node text`)
  }

  clone() {
    const node = new Node(this._type!, this._range ? this._range.clone() : this._range)

    node.id = this.id
    node._tokens = this._tokens.map(token => token.clone())
    if (this._attributes) node._attributes = cloneDeep(this._attributes)

    return node
  }

  toString() {
    const _tags = this.attributes.tags.length ? ` [${this.attributes.tags.join(`,`)}]` : ``
    return `${this.name}${_tags}`
  }

  // #region Traversal

  // #endregion
}
