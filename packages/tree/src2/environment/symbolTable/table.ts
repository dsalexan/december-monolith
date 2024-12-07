import assert from "assert"
import { groupBy, isString, max, orderBy, sum, uniq } from "lodash"
import { AnyObject, MaybeNull, MaybeUndefined, Nilable } from "tsdef"

import generateUUID from "@december/utils/uuid"

import churchill, { Block, paint, Paint } from "../../logger"

import type Environment from ".."

import Node, { SubTree } from "../../node"
import { byLevel, preOrder } from "../../node/traversal"
import { BY_TYPE } from "../../type/styles"
import { MasterScope } from "../../node/scope"
import Type from "../../type/base"

import Simbol, { SymbolFromNodeOptions, SymbolKey, SymbolValueInvoker } from "./symbol"
import { explainSymbolTable, SimbolExplainOptions } from "./explain"
import { ObjectSource } from ".."

export const _logger = churchill.child(`tree`, undefined, { separator: `` })

export type TreeName = string
export type NodeAddress = `${TreeName}::${Node[`id`]}`

export default class SymbolTable {
  public _: {
    symbols: {
      byKey: Map<SymbolKey, Simbol>
      byNodeAddess: Record<NodeAddress, SymbolKey>
    }
    nodes: {
      byAddress: Record<NodeAddress, Node>
      byKey: Map<SymbolKey, NodeAddress[]>
    }
  }

  constructor() {
    this.reset
  }

  /** Resets table */
  public reset() {
    this._ = {
      symbols: {
        byKey: new Map(),
        byNodeAddess: {},
      },
      nodes: {
        byAddress: {},
        byKey: new Map(),
      },
    }
  }

  /** Creates a symbol table from tree */
  static from(name: TreeName, tree: SubTree, options: SymbolFromNodeOptions) {
    const table = new SymbolTable()
    table.from(name, tree, options)

    return table
  }

  /** Populates symbol table from tree nodes */
  public from(name: TreeName, tree: SubTree, options: SymbolFromNodeOptions, reset: boolean = true) {
    if (reset) this.reset()

    byLevel(tree.root, node => {
      const symbol = Simbol.fromNode(node, options)
      if (symbol) this.add(symbol, name, node)
    })
  }

  /** Indexes a pair (Symbol, Node) */
  public add(symbol: Simbol, tree: TreeName, node: Node) {
    const nodeAddress: NodeAddress = `${tree}::${node.id}`

    this._.symbols.byKey.set(symbol.key, symbol)
    this._.symbols.byNodeAddess[nodeAddress] = symbol.key

    this._.nodes.byAddress[nodeAddress] = node
    if (this._.nodes.byKey[symbol.key] === undefined) this._.nodes.byKey.set(symbol.key, [])
    const list = this._.nodes.byKey.get(symbol.key)!
    list.push(nodeAddress)
  }

  /** List all nodes with symbols in table */
  public getNodes(): Node[] {
    return Object.values(this._.nodes.byAddress)
  }

  /** List all symbols in table */
  public getSymbols(): Simbol[] {
    return Array.from(this._.symbols.byKey.values())
  }

  /** List all symbolKeys in a table */
  public getSymbolKeys(): SymbolKey[] {
    return this.getSymbols().map(symbol => symbol.key)
  }

  /** List all symbols from table that are missing in environment */
  public getMissingSymbols(environment: Environment, includesFallback: boolean = false): Simbol[] {
    const missing: Simbol[] = []

    for (const symbol of this._.symbols.byKey.values()) {
      const sources: string[] = []

      const keyIsMissing = !environment.has(symbol.key, { sourcesOut: sources, includesFallback })
      if (keyIsMissing) missing.push(...environment.getAssociatedIdentifiers(symbol.key, includesFallback).map(identifier => identifier.toSymbol()))
    }

    return missing
  }

  /** List all symbol keys from table that are missing in environment */
  public getMissingSymbolKeys(environment: Environment, includesFallback: boolean = false): SymbolKey[] {
    return uniq(this.getMissingSymbols(environment, includesFallback).map(symbol => symbol.key))
  }

  /** Inject list of symbols into environment */
  public static injectIntoEnvironment(symbols: SymbolKey[], environment: Environment, getValue: SymbolValueInvoker): boolean {
    if (symbols.length === 0) return false

    // 1. Generate unique id for symbol table
    const uuid = generateUUID().substring(0, 4)
    const id = `symbolTable_${uuid}`

    assert(!environment.hasSource(id), `Symbol table already exists in environment`)

    // 2. Inject symbol keys into object source
    const symbolsSource = new ObjectSource(id)
    for (const symbolKey of symbols) Simbol.injectValueIntoObjectSource(symbolKey, symbolsSource, getValue)

    if (symbolsSource.size() === 0) return false

    environment.addSource(symbolsSource)

    return true
  }

  /** Prints state of symbol table */
  public print() {
    console.log(``)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger.add(paint.grey(`SYMBOL TABLE`)).info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    if (this._.symbols.byKey.size === 0) _logger.add(paint.grey.italic(`(No symbols found)`)).info()

    const rows: (Block | string)[][][] = []

    for (const symbol of this._.symbols.byKey.values()) {
      const row: (Block | string)[][] = []

      row.push([paint.white.bold(symbol.key)])

      const nodes: Node[] = this._.nodes.byKey[symbol.key]?.map(address => this._.nodes.byAddress[address]) ?? []
      for (const node of nodes) {
        const color = BY_TYPE(node.type) || paint.white

        row.push([`  `])
        row.push([color.dim.bold(node.name), color.dim(` (${node.type.toString()})`)])
      }

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
    _logger.add(`\n`).add(` `.repeat(26)).add(paint.grey.dim(`{\n`))
    for (const [symbolKey, nodeAddresses] of this._.nodes.byKey.entries()) {
      const nodes = nodeAddresses.map(address => this._.nodes.byAddress[address])

      // 1. compile types
      const nodesByType = groupBy(nodes, node => node.type.getFullName())

      // 2. Print types
      _logger.add(` `.repeat(30)) //
      for (const [, nodes] of Object.entries(nodesByType)) {
        const type = nodes[0].type

        let color = BY_TYPE(type)

        _logger
          .add(paint.grey.dim(`// `))
          .add(paint.white(` `.repeat(symbolKey.length + 1)))
          .add(color.dim(type.id + `:`))
          .add(color.dim.bold(type.name))
          .add(paint.grey(`, `))
      }
      _logger.add(`\n`)

      // 3. Print identifier
      _logger
        .add(` `.repeat(30)) //
        .add(paint.grey.dim(`"`))
        .add(paint.white(`${symbolKey}`))
        .add(paint.grey.dim(`": undefined, // `))

      // 3. Print lexemes
      for (const node of Object.values(nodesByType).flat()) {
        _logger.add(paint.grey(node.name)).add(paint.grey.dim(`, `))
      }

      _logger.add(`\n`)
    }
    _logger.add(`\n`).add(` `.repeat(26)).add(paint.grey.dim(`}\n`)).info()
  }

  /** Prints all symbols in table */
  public explain(options: SimbolExplainOptions = {}): Block[][] {
    return explainSymbolTable(this, options)
  }
}
