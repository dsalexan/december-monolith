import assert from "assert"

import churchill, { Block, padColumns, paint, Paint } from "../logger"

import { Node } from "../tree"
import { Simbol } from "./symbol"
import { VARIABLE_NOT_FOUND, type Environment, type VariableName } from "../interpreter"

export const _logger = churchill.child(`tree`, undefined, { separator: `` })

export class SymbolTable {
  public readonly table: Map<VariableName, Simbol>

  constructor() {
    this.table = new Map()
  }

  /** Packages and indexed symbol (through data) */
  public index(variableName: VariableName, treeName?: string, node?: Node): Simbol {
    // 1. If symbol is already indexed, just link its node
    if (this.has(variableName)) {
      const symbol = this.get(variableName)
      if (treeName) symbol.linkNode(treeName, node!)

      return symbol
    }

    // 2. If it is a new symbol, create, link and index it
    const symbol = new Simbol(variableName)
    if (treeName) symbol.linkNode(treeName, node!)

    this.add(symbol)

    return symbol
  }

  /** Adds a symbol to the index */
  public add(symbol: Simbol) {
    assert(this.table.has(symbol.name) === false, `Symbol already exists in table.`)
    this.table.set(symbol.name, symbol)
  }

  /** Check if a variable name is already indexed in table (as a symbol) */
  public has(name: VariableName): boolean {
    return this.table.has(name)
  }

  /** Return symbol by variable name */
  public get(name: VariableName): Simbol {
    const symbol = this.table.get(name)
    assert(symbol, `Symbol "${name}" not found in table.`)

    return symbol
  }

  /** Return all symbols missing in a specific environment */
  public getMissingSymbols(environment: Environment): Simbol[] {
    const missing: Simbol[] = []

    for (const symbol of this.table.values()) {
      // 1. Resolve symbol name. It could result in a DIFFERENT symbol that is not originally in the table
      const resolvedVariable = environment.resolve(symbol.name)

      // 2. Variable couldn't even be resolved
      if (!resolvedVariable) missing.push(symbol)
      // 3. Variable was resolved into ANOTHER variable, which is missing anywhere
      else if (resolvedVariable.environment === null) {
        // (so we index a new symbol and pass it as missing)
        debugger
        assert(resolvedVariable.variableName !== symbol.name, `Symbol name must be different.`)

        const newSymbol = this.index(resolvedVariable.variableName)
        missing.push(newSymbol)
      }
      // (if variable was resolved AND found, it is not missing)
    }

    // debugger
    return missing
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
