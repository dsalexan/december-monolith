import assert from "assert"

import churchill, { Block, paint, Paint } from "../../logger"

import type Node from "../../node"
import type { SubTree } from "../../node"
import { BY_TYPE } from "../../type/styles"
import { groupBy, isString, max, orderBy, sum } from "lodash"
import { getMasterScope, ScopeManager } from "../../node/scope"
import { byLevel } from "../../node/traversal"
import Type from "../../type/base"

export const _logger = churchill.child(`tree`, undefined, { separator: `` })

export interface Simbol {
  node: Node
  content: string // node content for symbol
}

export default class SymbolTable {
  public tree: SubTree
  public symbols: Map<string, Simbol> = new Map()
  private reverse_content: Map<string, string> = new Map() // content -> key

  constructor() {}

  static from(tree: SubTree, scopeManager: ScopeManager) {
    const table = new SymbolTable()
    table.from(tree, scopeManager)

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

  from(tree: SubTree, scopeManager: ScopeManager) {
    this.reset()

    this.tree = tree

    byLevel(tree.root, node => {
      const scope = scopeManager.evaluate(node)
      const master = getMasterScope(scope)

      const isIdentifier = node.type.id === `identifier`
      const isNonNumericLiteral = node.type.id === `literal` && ![`number`, `signed_number`].includes(node.type.name)
      const isOperand = node.type.modules.includes(`operand`)

      let isSymbol = false
      if (master === `math`) {
        isSymbol = isIdentifier || isNonNumericLiteral
      } else throw new Error(`Unimplemented master scope "${master}"`)

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
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    // 2. Print mock environment object
    const identifiers: Record<string, Node[]> = {}
    for (const symbol of this.symbols.values()) {
      identifiers[symbol.content] ??= []
      identifiers[symbol.content].push(symbol.node)

      // if (!identifiers[symbol.content].find(node => node.id === symbol.node.id)) identifiers[symbol.content].push(symbol.node)
    }

    let _identifiers = Object.entries(identifiers) as [string, Node[]][]
    _identifiers = orderBy(_identifiers, ([identifier]) => identifier.length, `desc`)

    _logger.add(`\n`).add(` `.repeat(26)).add(paint.grey.dim(`{\n`))
    for (const [identifier, nodes] of _identifiers) {
      // 1. compile types
      const nodesByType = groupBy(nodes, node => node.type.getFullName())

      // 2. Print types
      _logger.add(` `.repeat(30)) //
      for (const [, nodes] of Object.entries(nodesByType)) {
        const type = nodes[0].type

        let color = BY_TYPE(type)

        _logger
          .add(paint.grey.dim(`// `))
          .add(paint.white(` `.repeat(identifier.length + 1)))
          .add(color.dim(type.id + `:`))
          .add(color.dim.bold(type.name))
          .add(paint.grey(`, `))
      }
      _logger.add(`\n`)

      // 3. Print identifier
      _logger
        .add(` `.repeat(30)) //
        .add(paint.grey.dim(`"`))
        .add(paint.white(`${identifier}`))
        .add(paint.grey.dim(`": undefined, // `))

      // 3. Print lexemes
      for (const node of Object.values(nodesByType).flat()) {
        _logger.add(paint.grey(node.name)).add(paint.grey.dim(`, `))
      }

      _logger.add(`\n`)
    }
    _logger.add(`\n`).add(` `.repeat(26)).add(paint.grey.dim(`}\n`)).info()
  }
}
