import assert from "assert"

import churchill, { Block, paint, Paint } from "../../../logger"

import type Tree from "../../../tree"
import type Node from "../../../node"
import { BY_TYPE } from "../../../type/styles"
import { isString, max, sum } from "lodash"

export const _logger = churchill.child(`tree`, undefined, { separator: `` })

export interface Simbol {
  node: Node
  content: string // node content for symbol
}

export default class SymbolTable {
  public tree: Tree
  public symbols: Map<string, Simbol> = new Map()
  private reverse_content: Map<string, string> = new Map() // content -> key

  constructor() {}

  static from(tree: Tree) {
    const table = new SymbolTable()
    table.from(tree)

    return table
  }

  reset() {
    this.symbols.clear()
    this.reverse_content.clear()
  }

  set(symbol: Simbol) {
    const key = symbol.node.name

    assert(!this.symbols.has(key), `Symbol key already defined`)

    this.symbols.set(key, symbol)
    this.reverse_content.set(symbol.content, key)
  }

  has(content: string): boolean {
    return this.reverse_content.has(content)
  }

  get(key: string, type: `key` | `content` = `key`) {
    if (type === `key`) return this.symbols.get(key)
    else if (type === `content`) return this.reverse_content.get(key)

    throw new Error(`Type ${type} not implemented for searching symbol table`)
  }

  from(tree: Tree) {
    this.reset()

    this.tree = tree

    tree.traverse(node => {
      const isSymbol = node.type.id === `identifier` || node.type.id === `literal`

      if (!isSymbol) return

      const content: string = node.content as string

      assert(isString(content), `Non-string content`)

      const symbol: Simbol = {
        node,
        content,
      }

      this.set(symbol)
    })
  }

  print() {
    console.log(``)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`SYMBOL TABLE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    console.log(``)
    if (this.symbols.size === 0) _logger.add(paint.grey.italic(`(No symbols found)`)).info()

    const rows: (Block | string)[][][] = []

    for (const symbol of this.symbols.values()) {
      const row: (Block | string)[][] = []

      const color = BY_TYPE(symbol.node.type) || paint.white

      const content = symbol.content

      row.push([color.dim.bold(symbol.node.name), color.dim(` (${symbol.node.type.toString()})`)])
      row.push([`  `])
      row.push([paint.bold(content)])

      rows.push(row)
    }

    for (const [i, row] of rows.entries()) {
      for (const [j, blocks] of row.entries()) {
        const size = max(rows.map(row => sum(row[j].map(block => block.length))))!
        const length = sum(blocks.map(block => block.length))

        const padding = size - length

        for (const block of blocks) _logger.add(block instanceof String ? paint.identity(block) : block)
        if (padding) _logger.add(` `.repeat(padding))
      }

      _logger.info()
    }

    console.log(``)
  }
}
