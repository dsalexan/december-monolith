import assert from "assert"

import generateUUID from "@december/utils/uuid"

import churchill, { Block, paint, Paint } from "../../logger"

import type Environment from ".."

import type Node from "../../node"
import type { SubTree } from "../../node"
import { BY_TYPE } from "../../type/styles"
import { groupBy, isString, max, orderBy, sum, uniq } from "lodash"
import { MasterScope } from "../../node/scope"
import { byLevel } from "../../node/traversal"
import Type from "../../type/base"
import { AnyObject, MaybeNull, MaybeUndefined, Nilable } from "tsdef"

export const _logger = churchill.child(`tree`, undefined, { separator: `` })

export class Simbol {
  private node: Node
  private content: string // node content for symbol
  private value: string // node value for symbol, usually a cleaner version of content (like removing quotes)

  constructor(node: Node, content: string, value: string) {
    this.node = node
    this.content = content
    this.value = value
  }

  get key() {
    return this.value.trim()
  }

  getNode() {
    return this.node
  }

  getContent() {
    return this.content
  }

  getValue() {
    return this.value
  }
}

export default class SymbolTable {
  // public tree: SubTree
  public symbols: Map<string, Simbol[]> = new Map() // key -> symbol
  private reverse_content: Map<Simbol[`content`], string[]> = new Map() // content -> key
  private reverse_value: Map<Simbol[`value`], string[]> = new Map() // value -> key

  constructor() {}

  static from(tree: SubTree, masterScope: MasterScope) {
    const table = new SymbolTable()
    table.from(tree, masterScope)

    return table
  }

  reset() {
    this.symbols.clear()
    this.reverse_content.clear()
    this.reverse_value.clear()
  }

  set(symbol: Simbol) {
    const key = symbol.key
    const content = (symbol as any).content as Simbol[`content`]
    const value = (symbol as any).value as Simbol[`value`]

    const _content = this.reverse_content.get(content) || []
    const _value = this.reverse_value.get(value) || []

    if (this.symbols.has(key)) {
      const byContent = _content?.includes(key)
      const byValue = _value?.includes(key)
      const byNode = this.symbols.get(key)?.some(symbol => symbol.getNode().id === symbol.getNode().id)

      // no need to set symbol if it is already indexed
      const symbolAlreadyIndexed = byContent && byValue && byNode
      if (symbolAlreadyIndexed) return
    }

    // assert(!this.symbols.has(key), `Symbol key (node.name) already defined`)

    const symbols = this.symbols.get(key) || []
    symbols.push(symbol)
    this.symbols.set(key, symbols)

    _content.push(key)
    this.reverse_content.set(content, _content)

    _value.push(key)
    this.reverse_value.set(value, _value)
  }

  hasContent(content: string): boolean {
    return this.reverse_content.has(content)
  }

  hasValue(value: string): boolean {
    return this.reverse_value.has(value)
  }

  get(key: string, type?: `key`): MaybeUndefined<Simbol>
  get(key: string, type: `content` | `value`): Simbol[]
  get(key: string, type: `key` | `content` | `value` = `key`): MaybeUndefined<Simbol> | Simbol[] {
    if (type === `key`) return this.symbols.get(key)
    else if (type === `content` || type === `value`) {
      if (type === `value`) debugger // WARN: Untested

      const keys = type === `content` ? this.reverse_content.get(key) : this.reverse_value.get(key)
      return keys ? keys.map(key => this.get(key)!) : []
    }

    throw new Error(`Type ${type} not implemented for searching symbol table`)
  }

  static symbolFromNode(node: Node, masterScope: MasterScope): MaybeNull<Simbol> {
    const isNil = node.type.name === `nil`
    const isIdentifier = node.type.id === `identifier`
    const isNonNumericLiteral = node.type.isLiteralLike() && ![`number`, `sign`].includes(node.type.name) && !isNil
    const isOperand = node.type.modules.includes(`operand`)

    // 1. Check if node is a valid symbol
    let isSymbol = false
    if (masterScope === `math-enabled`) {
      isSymbol = isIdentifier || isNonNumericLiteral
    } else throw new Error(`Unimplemented master scope "${masterScope}"`)

    if (!isSymbol) return null

    // 2. Build symbol
    const content = node.content as string
    assert(isString(content), `Non-string content`)

    let value: string = node.content as string
    if (node.attributes.tags.includes(`from-quotes`)) value = content.slice(1, -1)

    return new Simbol(node, content, value)
  }

  from(tree: SubTree, masterScope: MasterScope, reset: boolean = true) {
    if (reset) this.reset()

    byLevel(tree.root, node => {
      const symbol = SymbolTable.symbolFromNode(node, masterScope)
      if (symbol) this.set(symbol)
    })
  }

  filter(fn: (symbol: Simbol) => boolean) {
    const symbols = this.symbols.values()

    return [...symbols].flat().filter(fn)
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
      const node = (symbol as any).node as Simbol[`node`]
      const content = (symbol as any).content as Simbol[`content`]

      const row: (Block | string)[][] = []

      const color = BY_TYPE(node.type) || paint.white

      row.push([color.dim.bold(node.name), color.dim(` (${node.type.toString()})`)])
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
      const node = (symbol as any).node as Simbol[`node`]
      const content = (symbol as any).content as Simbol[`content`]

      identifiers[content] ??= []
      identifiers[content].push(node)

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

  getMissingSymbols(environment: Environment): Simbol[] {
    const missing: Simbol[] = []

    for (const symbols of this.symbols.values()) {
      for (const symbol of symbols) if (!environment.has(symbol.key)) missing.push(symbol)
    }

    return missing
  }

  /** Inject list of symbols into environment */
  public injectIntoEnvironment(environment: Environment, getValue: SymbolValueInvoker): boolean {
    return SymbolTable.injectIntoEnvironment([...this.symbols.values()].flat(), environment, getValue)
  }

  /** Inject list of missing symbols from table into environment */
  public injectMissingSymbolsIntoEnvironment(environment: Environment, getValue: SymbolValueInvoker): boolean {
    const missingSymbols = this.getMissingSymbols(environment)
    return SymbolTable.injectIntoEnvironment(missingSymbols, environment, getValue)
  }

  /** Inject list of symbols into environment */
  public static injectIntoEnvironment(allSymbols: Simbol[], environment: Environment, getValue: SymbolValueInvoker): boolean {
    if (allSymbols.length === 0) return false

    const id = generateUUID().substring(0, 4)

    assert(!environment.hasSource(`symbolTable_${id}`), `Symbol table already exists in environment`)

    // 1. Group symbols by key
    const symbolsByKey = groupBy(allSymbols, symbol => symbol.key)

    const symbolsSource: AnyObject = {}
    for (const [key, symbols] of Object.entries(symbolsByKey)) {
      // 2. Check if environment already has symbol
      if (environment.has(key)) {
        debugger
      }

      // 3. Invoke symbol value and set it in source

      /**
       * valueIvoker -> returns value for symbol
       *    null -> symbol reference not found
       *    undefined -> fetch scenario not implemented
       *    value -> symbol reference found
       */
      const value = getValue(key, symbols)
      if (value === null) continue

      const keys = uniq(symbols.map(symbol => symbol.key))
      assert(value !== undefined, `Fetch for symbol key "${key} (${keys.join(`, `)})" not implemented`)

      symbolsSource[key] = value
    }

    const sourceHasData = Object.keys(symbolsSource).length > 0
    if (!sourceHasData) return false

    environment.addObjectSource(`symbolTable_${id}`, symbolsSource)
    return true
  }

  explain(environment: Environment, options: SymbolTableExplainOptions): Block[][] {
    const symbols = [...this.symbols.values()]
    const lines = symbols.map(symbols => symbols.map(symbol => SymbolTable.explainSymbol(symbol, environment, options))).flat()
    return lines.filter(blocks => blocks.length > 0) as Block[][]
  }

  static explainSymbol(symbol: Simbol, environment: Environment, { translationFn, hidePresent }: SymbolTableExplainOptions): Block[] {
    const blocks: Block[] = []

    const proxiedKey = translationFn?.(symbol) ?? symbol.key // proxiedKey, i.e. translationTable.get(symbol)

    const isPresentInEnvironment = environment.has(symbol.key)
    const hide = hidePresent && isPresentInEnvironment
    if (hide) return []

    // blocks.push(paint.identity(` `.repeat(10)))
    // blocks.push(paint.grey.dim(`[${object.id}/`), paint.grey(object.data.name), paint.grey.dim(`]`))
    // blocks.push(paint.identity(` `))
    const color = isPresentInEnvironment ? paint.green : paint.red.bold

    if (symbol.key !== proxiedKey)
      blocks.push(
        paint.grey.dim(symbol.key), //
        paint.grey.dim(` -> `),
        color(proxiedKey),
      )
    else blocks.push(color(symbol.key))

    if (isPresentInEnvironment) {
      const value = environment.get(symbol.key).getValue.call(environment, symbol)
      blocks.push(paint.grey.dim(` (${value})`))
    }

    return blocks
  }
}

export interface SymbolTableExplainOptions {
  translationFn?: (symbol: Simbol) => MaybeUndefined<string>
  hidePresent?: boolean
}

export type SymbolValueInvoker = (key: string, symbols: Simbol[]) => Nilable<AnyObject>
export type SymbolIndex = Record<Simbol[`key`], Simbol[]>
