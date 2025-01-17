import assert from "assert"

import churchill, { Block, padColumns, paint, Paint } from "../logger"

import { Node } from "../tree"
import { Simbol, SymbolValue } from "./symbol"
import { VARIABLE_NOT_FOUND, type Environment, type VariableName } from "../interpreter"

export const _logger = churchill.child(`tree`, undefined, { separator: `` })

export class SymbolTable {
  public readonly table: Map<Simbol[`key`], Simbol>

  constructor() {
    this.table = new Map()
  }

  /** Reset all links between nodes and symbols */
  public resetLinks() {
    for (const symbol of this.table.values()) symbol.linkedNodes.clear()
  }

  /** Packages and indexed symbol (through data) */
  public index(value: SymbolValue, treeName?: string, node?: Node): Simbol {
    const newSymbol = new Simbol(value)

    // 1. If symbol is already indexed, just link its node
    if (this.has(newSymbol.key)) {
      const symbol = this.get(newSymbol.key)
      if (treeName) symbol.linkNode(treeName, node!)

      return symbol
    }

    // 2. If it is a new symbol, create, link and index it
    if (treeName) newSymbol.linkNode(treeName, node!)

    this.add(newSymbol)

    return newSymbol
  }

  /** Adds a symbol to the index */
  public add(symbol: Simbol) {
    assert(this.table.has(symbol.key) === false, `Symbol already exists in table.`)
    this.table.set(symbol.key, symbol)
  }

  /** Check if a symbol is already indexed in table */
  public has(key: Simbol[`key`]): boolean {
    return this.table.has(key)
  }

  /** Return symbol by key */
  public get(key: Simbol[`key`]): Simbol {
    const symbol = this.table.get(key)
    assert(symbol, `Symbol "${key}" not found in table.`)

    return symbol
  }

  /** Return all symbols contextualized for a specific environment (i.e. resolving them in that env) */
  public getAllSymbols(environment: Environment): Simbol[] {
    const symbols: Record<Simbol[`key`], Simbol> = {}

    const allSymbols = [...this.table.values()]
    for (const symbol of allSymbols) {
      const variants: Simbol[] = [symbol, ...this._contextualizeSymbol(symbol, environment)]
      for (const variant of variants) {
        // we index all variants, as long as the key (flatten path usually) is unique
        if (!symbols[variant.key]) symbols[variant.key] = variant
      }
    }

    return Object.values(symbols)
  }

  /** Return all unique variables contextualized for a specific environment */
  public getAllVariables(environment: Environment): Simbol[] {
    const variables: Record<VariableName, Simbol> = {}

    const symbols = [...this.table.values()]
    for (const symbol of symbols) {
      // (so we index a new symbol and push it)
      // (it being missing or not is irrelevant)

      const variants: Simbol[] = [symbol, ...this._contextualizeSymbol(symbol, environment)]
      for (const variant of variants) {
        // we index the first occurent of a variableName, since it is the only "variable" part really (thinking of the paths - properties - as fixed)
        if (!variables[variant.variableName]) variables[variant.variableName] = variant
      }
    }

    return Object.values(variables)
  }

  /** Contextualize symbol for a environment tree (usually by checking synonyms and resolving variable names) */
  protected _contextualizeSymbol(symbol: Simbol, environment: Environment): Simbol[] {
    const variantSymbols: Simbol[] = []

    // 1. Resolve variable name
    const resolvedVariable = environment.resolve(symbol.variableName)

    // 2. Build variant symbol
    if (!!resolvedVariable && resolvedVariable.variableName !== symbol.variableName) {
      const clone = symbol.clone({ variableName: resolvedVariable.variableName })
      const newSymbol = this.index(clone.value)
      variantSymbols.push(newSymbol)
    }

    return variantSymbols
  }

  /** Prints table state */
  public print(environment?: Environment) {
    console.log(``)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger.add(paint.grey(`SYMBOL TABLE`)).info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    if (this.table.size === 0) _logger.add(paint.grey.italic(`(No symbols found)`)).info()

    // 1. Print each symbol
    const symbols = Array.from(this.table.values())
    const rowsOfSymbols: Block[][] = padColumns(symbols.map(symbol => symbol.explain(environment)))
    for (const row of rowsOfSymbols) _logger.add(row).info()

    console.log(``)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    // TODO: 2. Print mock environment object
  }
}
