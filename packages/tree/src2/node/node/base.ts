import { v4 as uuidv4 } from "uuid"
import assert from "assert"
import { add, cloneDeep, isEmpty, isNil, isString, uniqBy } from "lodash"

import { Range } from "@december/utils"

import Type from "../../type/base"
import Token from "../../token"
import { Scope } from "../scope"
import { GenericTraversal, preOrder } from "../traversal"
import { numberToLetters } from "../../utils"

import { NodeIndexing, createIndexing, updateIndex, refreshIndexing } from "./indexing"
import { removeParent, setParent, getChildren } from "./children"
import NodeCollection from "./collection"
import { ancestor, offspring, sibling } from "./hierarchy"
import { find, findAncestor, findByTraversal } from "./find"
import { setType, NodeBalancing, balancing } from "./type"
import { addToken, clearTokens, tokenize, content, range as __range } from "./token"
import { Attributes, createAttributes, setAttributes } from "./attributes"
import { toString, repr, debug } from "./repr"
import { clone, createNil, createList, createFromToken } from "./factories"
import {
  // MOVE
  swapWith,
  groupChildren,
  // SYNTACTICAL
  SyntacticalOperations,
} from "./operations"

import { ROOT } from "../../type/declarations/structural"

type Nullable<T> = T | null

export class Node {
  public id: string = uuidv4()
  public scope: Scope[] = []

  constructor(type: Type, range: Range)
  constructor(token: Token, range?: Range)
  constructor(tokenOrType: Token | Type, range?: Range) {
    this._tokens = tokenOrType instanceof Token ? [tokenOrType] : []
    this._type = tokenOrType instanceof Type ? tokenOrType : null

    if (tokenOrType instanceof Type && range) this._range = range
  }

  // INDEX
  public indexing: NodeIndexing = createIndexing()

  protected _index: number = -1
  public get index() {
    return this._index
  }

  public updateIndex = updateIndex
  public refreshIndexing = refreshIndexing

  // PARENT
  protected _parent: Nullable<Node> = null
  public get parent() {
    return this._parent
  }

  public setParent = setParent
  public removeParent = removeParent

  // TODO: assert(root.type.name === `root`, `Root node not found`)
  get root(): Node {
    return this.parent ? this.parent.root : this
  }

  public get level(): number {
    return this.parent ? this.parent.level + 1 : 0
  }

  public get path(): string[] {
    return this.parent ? [...this.parent.path, this.name] : [`root`]
  }

  // CHILDREN
  public children: NodeCollection = new NodeCollection(this)
  public getChildren = getChildren

  public get height() {
    return this.children.reduce((acc, child) => Math.max(acc, child.height), 0) + 1
  }

  // HIERARCHY
  public ancestor = ancestor
  public offspring = offspring
  public sibling = sibling

  // FIND
  public find = find
  public findAncestor = findAncestor
  public findByTraversal = findByTraversal

  // TYPE
  protected _type: Nullable<Type>
  public get type(): Type {
    assert(this._type || this._tokens.length > 0, `Node has no type or token`)

    if (this._type) return this._type

    const tokens = this._tokens.map(token => token?.type).filter(type => !isNil(type))
    const uniqueTokens = uniqBy(tokens, token => token.name)

    assert(uniqueTokens.length > 0, `Node has multiple token types`)

    return uniqueTokens[0]
  }

  public setType = setType

  public get name() {
    if (this.type.name === `root`) return `root`

    const number = this.indexing.level === -1 ? `${this.index === -1 ? `` : this.index}*` : numberToLetters(this.indexing.level)

    return `${this.type.prefix}${this.level}.${number}`
  }

  // TOKEN
  protected _range: Range // fallback range, i.e. this is only returned in "get range()" if node is tokenless AND childless
  public updateFallbackRange(range: Range) {
    this._range = range
  }

  protected _tokens: Token[]
  public get tokens() {
    return this._tokens
  }

  public addToken = addToken
  public clearTokens = clearTokens
  public tokenize = tokenize

  public get lexeme() {
    if (this.tokens.length === 0) return this.children.map(child => child.lexeme).join(``)
    return this._tokens.map(token => token.lexeme).join(``)
  }

  // eslint-disable-next-line prettier/prettier
  public get balancing(): NodeBalancing { return balancing.call(this) }

  // eslint-disable-next-line prettier/prettier
  public get content(): Nullable<string> { return content.call(this) }

  // eslint-disable-next-line prettier/prettier
  public get range(): Range { return __range.call(this) }

  // ATTRIBUTES
  protected _attributes: Attributes = createAttributes()
  public get attributes() {
    return this._attributes
  }

  public setAttributes = setAttributes

  // FACTORIES
  public clone = clone
  public static ROOT(range: Range) {
    return new Node(ROOT, range)
  }
  public NIL = createNil
  public LIST = createList
  public static fromToken = createFromToken

  // REPR
  public toString = toString
  public repr = repr
  public debug = debug

  // OPERATIONS
  public syntactical = new SyntacticalOperations(this)

  public swapWith = swapWith
  public groupChildren = groupChildren
}
