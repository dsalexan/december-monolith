import assert from "assert"
import { add, cloneDeep, isEmpty, isNil, isString, uniqBy } from "lodash"
import { Nullable } from "tsdef"

import { Range } from "@december/utils"
import uuid from "@december/utils/uuid"

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
import { setType, NodeBalancing, balancing, comparePriority } from "./type"
import { addToken, clearTokens, tokenize, content, NodeTokenizeOptions, range as __range, blocks } from "./token"
import { Attributes, createAttributes, setAttributes } from "./attributes"
import { toString, repr, debug } from "./repr"
import { clone } from "./factories"
import {
  // MOVE
  swapWith,
  groupChildren,
  // SYNTACTICAL
  SyntacticalOperations,
} from "./operations"

import { ROOT } from "../../type/declarations/structural"
import { IsolationScope } from "../scope/types"
import logger, { Block, paint } from "../../logger"

export const NON_EVALUATED_SCOPE = Symbol.for(`NODE:NON_EVALUATED_SCOPE`)

export interface NodeScope {
  isolation: IsolationScope[]
  contextualized: Scope[]
}

export class Node {
  public id: string = uuid()
  public version: number = 0

  // constructor(type: Type, range: Range)
  // constructor(token: Token, range?: Range)
  // constructor(tokenOrType: Token | Type, range?: Range) {
  //   this._tokens = tokenOrType instanceof Token ? [tokenOrType] : []
  //   this._type = tokenOrType instanceof Type ? tokenOrType : null

  //   if (tokenOrType instanceof Type) {
  //     assert(range, `Range must be provided for a node without token`)
  //     this._range = range
  //   }
  // }
  constructor(token: Token) {
    this._tokens = [token]
  }

  static tokenless(type: Type, range: Range) {
    const node = new Node(null as any)
    node._tokens = []

    node._type = type
    node._range = range

    return node
  }

  // SCOPE
  protected scope: typeof NON_EVALUATED_SCOPE | NodeScope = NON_EVALUATED_SCOPE

  public getScope(): Scope[]
  public getScope(type: `isolation`): IsolationScope[]
  public getScope(type: `contextualized`): Scope[]
  public getScope(type: `isolation`, strict: false): Nullable<IsolationScope[]>
  public getScope(type: `contextualized`, strict: false): Nullable<Scope[]>
  public getScope(type: `isolation` | `contextualized` = `contextualized`, strict = true): Nullable<IsolationScope[] | Scope[]> {
    assert(this.scope !== NON_EVALUATED_SCOPE, `Scope not evaluated yet`)

    if (strict) {
      assert(this.scope.contextualized !== undefined, `Scope not evaluated yet`)
      assert(this.scope.isolation !== undefined, `Scope not evaluated yet`)
    }

    return this.scope[type] ?? null
  }

  public setScope(type: `isolation`, scope: IsolationScope[]): void
  public setScope(type: `contextualized`, scope: Scope[]): void
  public setScope(type: `isolation` | `contextualized`, scope: (Scope | IsolationScope)[]): void {
    if (this.scope === NON_EVALUATED_SCOPE) this.scope = { isolation: undefined, contextualized: undefined } as any

    this.scope[type] = scope
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

  public comparePriority = comparePriority

  static sortByPriority(nodes: Node[], rule: `lexical` | `syntactical`, order = `asc`): Node[] {
    const sorted = nodes
      .map((node, index) => ({ node, index })) // map index
      .sort((a, b) => a.node.comparePriority(b.node, rule) * (order === `desc` ? -1 : 1) || a.index - b.index) // sort by priority
      .map(({ node }) => node)

    return sorted
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
  public get blocks(): Nullable<Block[]> { return blocks.call(this) }
  // eslint-disable-next-line prettier/prettier
  public get content(): Nullable<string> { return content.call(this) }
  public getContent(options?: Partial<NodeTokenizeOptions>): string | null {
    return content.call(this, options)
  }
  public getDebugContent(options?: Partial<NodeTokenizeOptions>): string | null {
    return content.call(this, {
      wrapInParenthesis: (node: Node) => [`operator`, `enclosure`].includes(node.type.id),
      showType: true,
      ...options,
    })
  }
  public getTreeContent(options: Partial<{ maxLevel: number }> = {}) {
    const maxLevel = options.maxLevel === undefined ? Infinity : options.maxLevel + this.level

    console.log(` `)
    preOrder(this, node => {
      if (node.level > maxLevel) return

      logger.add(` `.repeat(node.level * 2))
      logger.add(...paint.grey(paint.dim(`[`), node.name, paint.dim(`]`))).add(`  `)

      const content = node.blocks
      assert(content !== null, `Huh?`)
      logger.add(...paint.white(content))
      logger.debug()
    })
  }
  public getTreeHash() {
    return `${this.id}::${this.getDebugContent()}`
  }

  // eslint-disable-next-line prettier/prettier
  public get range(): Range { return __range.call(this) }
  public tryGetRange(): Nullable<Range> {
    try {
      return this.range
    } catch {
      //
    }

    return null
  }

  // ATTRIBUTES
  protected _attributes: Attributes = createAttributes()
  public get attributes() {
    return this._attributes
  }

  public setAttributes = setAttributes

  // FACTORIES
  public clone = clone
  // public static ROOT(range: Range) {
  //   return Node.tokenless(ROOT, range)
  // }
  // public NIL = createNil
  // public LIST = createList
  // public static fromToken = createFromToken

  // REPR
  public toString = toString
  public repr = repr
  public debug = debug

  // OPERATIONS
  public syntactical = new SyntacticalOperations(this)

  public swapWith = swapWith
  public groupChildren = groupChildren
}
