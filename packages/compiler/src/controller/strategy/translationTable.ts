import assert from "assert"
import { AnyObject, MaybeUndefined, Nilable } from "tsdef"
import { isNil, isString } from "lodash"

import { Environment, Simbol } from "@december/tree"

// Basically converts a symbol to something proxiable
export type SymbolTranslationValue = string

export class ProcessingSymbolTranslationTable {
  table: Record<Simbol[`value`], SymbolTranslationValue> // value -> translation
  fns: ((symbolOrKey: Simbol | Simbol[`key`]) => SymbolTranslationValue)[] = []

  constructor(table: Record<string, SymbolTranslationValue> = {}) {
    this.table = {}
    for (const [key, value] of Object.entries(table)) this.set(key, value)
  }

  public set(key: string, value: SymbolTranslationValue): this {
    assert(!isNil(value), `Symbol translation value cannot be nil`)

    this.table[key] = value

    return this
  }

  public add(fn: (symbol: Simbol) => SymbolTranslationValue): this {
    this.fns.push(fn)

    return this
  }

  public has(symbolKey: Simbol[`key`]): boolean
  public has(symbol: Simbol): boolean
  public has(symbolOrKey: Simbol | Simbol[`key`]): boolean {
    const key = isString(symbolOrKey) ? symbolOrKey : symbolOrKey.key

    return !isNil(this.table[key]) || this.fns.some(fn => !isNil(fn(symbolOrKey)))
  }

  public get(symbol: Simbol): MaybeUndefined<SymbolTranslationValue> {
    const values: SymbolTranslationValue[] = []

    const fromTable = this.table[symbol.key]
    if (!isNil(fromTable)) values.push(fromTable)

    for (const fn of this.fns) {
      const fromFunction = fn(symbol)
      if (!isNil(fromFunction)) values.push(fromFunction)
    }

    assert(values.length <= 1, `Symbol "${symbol.key}" has more than one translation`)

    return values[0]
  }

  // /** Returns a collection of symbols with the same value */
  // public getSymbolCollection(): Simbol[][] {
  //   const collection: Simbol[][] = []

  //   for (const key of Object.keys(this.table)) {
  //     const fakeSymbol: Simbol = {
  //       node: null as any,
  //       content: null as any,
  //       value: key,
  //     }

  //     collection.push([fakeSymbol])
  //   }

  //   return collection
  // }

  /** Injects translation table into environment */
  public injectIntoEnvironment(environment: Environment, getValue: TranslationTableValueInvoker) {
    if (Object.keys(this.table).length === 0) return false

    assert(!environment.hasSource(`translationTable`), `Translation table already exists in environment`)

    const translationTableSource: AnyObject = {}
    for (const key of Object.keys(this.table)) {
      /**
       * fetchReference -> returns value for reference
       *    null -> reference not found
       *    undefined -> fetch scenario not implemented
       *    value -> reference found
       */
      const translation = this.table[key]
      const value = getValue(translation, key)
      if (value === null) continue

      assert(value !== undefined, `Fetch for translation "${translation} (${key})" not implemented`)

      translationTableSource[key] = value
    }

    const sourceHasData = Object.keys(translationTableSource).length > 0
    if (!sourceHasData) return false

    environment.addObjectSource(`translationTable`, translationTableSource)
    return true
  }
}

export type TranslationTableValueInvoker = (translation: SymbolTranslationValue, key: string) => Nilable<AnyObject>
