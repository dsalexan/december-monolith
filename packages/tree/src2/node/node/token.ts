import { isArray, uniq } from "lodash"

import { Point, Range } from "@december/utils"

import Token from "../../token"
import { Node } from "./base"
import { inOrder } from "../traversal"
import assert from "assert"

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

export function tokenize(level?: number): { node: Node; token?: Token }[] {
  const list: { node: Node; token?: Token }[] = []

  inOrder(this, (node, token, ignorable) => !ignorable && list.push({ node, token: token || undefined }), level)

  return list
}

export function content(this: Node): string | null {
  if (this._tokens.length === 0 && this.children.length === 0) return null

  const strings: string[] = []

  const tokens = this.tokenize()
  for (const { node, token } of tokens) {
    if (token) strings.push(token.lexeme)
    else {
      // Non-overflowable content
      // TODO: Implement for tokenless and childless nodes that are not points
      if (this._tokens.length === 0 && this.children.length === 0 && !this._range.columnIsPoint(`first`)) debugger

      if (this._tokens.length) strings.push(this._tokens.map(token => token.lexeme).join(``))
    }
  }

  return strings.join(``)
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
  for (const { node, token } of tokens) range.addEntry(...(token ? [token.interval] : node.range.getEntries()))

  return range
}
