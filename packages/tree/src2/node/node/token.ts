import { isArray, uniq } from "lodash"

import { Point, Range } from "@december/utils"

import Token from "../../token"
import { Node } from "./base"
import { inOrder, InOrderTraversalOptions } from "../traversal"
import assert from "assert"
import { Block, paint } from "../../logger"
import { Nullable } from "tsdef"

export interface NodeTokenizeOptions {
  level: number
  wrapInParenthesis: InOrderTraversalOptions[`wrapInParenthesis`]
  showType: boolean
}

export function addToken(this: Node, token: Token | Token[], index?: number) {
  const tokens = isArray(token) ? token : [token]

  // check if all tokens have the same signature
  const signatures = uniq(tokens.map(token => token.signature).concat(this._tokens.map(token => token.signature)))
  assert(signatures.length === 1, `All tokens must have the same signature`)

  // inject tokens at index
  this._tokens.splice(index ?? this._tokens.length, 0, ...tokens)
}

export function clearTokens() {
  this._tokens.splice(0, this._tokens.length)
}

export function content(this: Node, options: Partial<NodeTokenizeOptions> = {}): string | null {
  if (this._tokens.length === 0 && this.children.length === 0) return null

  const strings: string[] = []

  const tokens = this.tokenize(options)
  for (const word of tokens) {
    if (word.type === `node`) {
      if (word.token) strings.push(word.token.lexeme)
      else {
        // // Non-overflowable content
        // // TODO: Implement for tokenless and childless nodes that are not points
        // if (this._tokens.length === 0 && this.children.length === 0 && !this._range.columnIsPoint(`first`)) debugger

        // if (this._tokens.length) strings.push(this._tokens.map(token => token.lexeme).join(``))

        // Non-overflowable content
        // TODO: Implement for tokenless and childless nodes that are not points
        if (word.node._tokens.length === 0 && word.node.children.length === 0 && !word.node._range.columnIsPoint(`first`)) debugger

        if (word.node._tokens.length) strings.push(word.node._tokens.map(token => token.lexeme).join(``))
      }
    } else if (word.type === `artefact`) strings.push(word.value)
    // @ts-ignore
    else throw new Error(`Unimplemented tokenized word type "${word.type}"`)
  }

  return strings.join(``)
}

export function blocks(this: Node, options: Partial<NodeTokenizeOptions> = {}): Nullable<Block[]> {
  if (this._tokens.length === 0 && this.children.length === 0) return null

  const blocks: Block[] = []

  const tokens = this.tokenize(options)
  for (const word of tokens) {
    if (word.type === `node`) {
      if (word.token) {
        let color = paint.dim
        if (word.node.id === this.id) color = paint.identity

        blocks.push(color(word.token.lexeme))
      } else {
        // // Non-overflowable content
        // // TODO: Implement for tokenless and childless nodes that are not points
        // if (this._tokens.length === 0 && this.children.length === 0 && !this._range.columnIsPoint(`first`)) debugger

        // if (this._tokens.length) strings.push(this._tokens.map(token => token.lexeme).join(``))

        debugger
        // Non-overflowable content
        // TODO: Implement for tokenless and childless nodes that are not points
        if (word.node._tokens.length === 0 && word.node.children.length === 0 && !word.node._range.columnIsPoint(`first`)) debugger

        for (const token of word.node._tokens) blocks.push(paint.identity(token.lexeme))
      }
    } else if (word.type === `artefact`) blocks.push(paint.grey.dim(word.value))
    // @ts-ignore
    else throw new Error(`Unimplemented tokenized word type "${word.type}"`)
  }

  return blocks
}

export function range(this: Node): Range {
  // isRoot
  if (this.type.name === `root`) {
    const range = this._range.clone()

    // search children and tokens for before/after points
    const entries = this.children.map(child => child.range.getEntries()).flat()

    const start = range.column(`first`)
    const end = range.column(`last`)
    for (const entry of entries) {
      if (entry instanceof Point) {
        if (entry.index <= start || entry.index >= end + 1) range.addEntry(entry)
      }
    }

    return range
  }

  if (this._tokens.length === 0 && this.children.length === 0) return this._range

  if (this.children.length === 0) return new Range(...this.tokens.map(token => token.interval))

  const range = new Range()

  const tokens = this.tokenize()
  for (const word of tokens) {
    if (word.type === `node`) range.addEntry(...(word.token ? [word.token.interval] : word.node.range.getEntries()))
    else throw new Error(`Unimplemented tokenized word type "${word.type}"`)
  }

  return range
}

export function tokenize(options: Partial<NodeTokenizeOptions> = {}): NodeTokenizedWord[] {
  const list: NodeTokenizedWord[] = []

  inOrder(
    this,
    (node, token, { ignorable, first }) => {
      if (ignorable) return

      if (token?.type === `word`) list.push({ type: `artefact`, node, value: token.value })
      else list.push({ type: `node`, node, token: token || undefined })
    },
    options.level,
    { wrapInParenthesis: options.wrapInParenthesis, showType: options.showType },
  )

  return list
}

export interface NodeTokenizedWord_Node {
  type: `node`
  node: Node
  token?: Token
}

export interface NodeTokenizedWord_Artefact {
  type: `artefact`
  node: Node
  value: string
}

export type NodeTokenizedWord = NodeTokenizedWord_Node | NodeTokenizedWord_Artefact
