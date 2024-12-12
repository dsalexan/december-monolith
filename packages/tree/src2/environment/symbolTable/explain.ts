import assert from "assert"
import { groupBy, isFunction, isString, max, orderBy, sum, uniq } from "lodash"
import { AnyObject, MaybeNull, MaybeUndefined, Nilable, Nullable } from "tsdef"

import churchill, { Block, paint, Paint } from "../../logger"

import type Environment from ".."

import type Node from "../../node"
import type { SubTree } from "../../node"
import { BY_TYPE } from "../../type/styles"
import { MasterScope } from "../../node/scope"
import { byLevel } from "../../node/traversal"
import Type from "../../type/base"

import Simbol from "./symbol"
import SymbolTable from "./table"

export interface SimbolExplainOptions {
  environment?: Environment
  hideIfPresentInEnvironment?: boolean
  translatedKey?: Simbol[`key`]
}

/** Explain Symbol */
export function explainSymbol(symbol: Simbol, { environment, hideIfPresentInEnvironment, translatedKey: _translatedKey }: SimbolExplainOptions): Block[] {
  const blocks: Block[] = []

  let isPresentInEnvironment: Nullable<boolean> = null
  let hasFallback: Nullable<boolean> = null

  // 1. Check if symbol is present in environment
  if (environment) {
    //      [TranslationTable] is irrelevant here, since it uses the translated key to FETCH the value, always storing it along the original symbol key
    isPresentInEnvironment = environment.has(symbol.key)

    // bail if we should hide present symbols
    if (hideIfPresentInEnvironment && isPresentInEnvironment) return []
  }

  // 2. Print symbol content (and translatedKey if informed)
  const translatedKey = _translatedKey ?? symbol.key

  let color: Paint = paint.white
  if (environment) {
    if (isPresentInEnvironment) color = paint.green
    else {
      hasFallback = environment.has(symbol.key, { includesFallback: true })
      color = hasFallback ? paint.yellow : paint.red
    }
  }

  if (translatedKey !== symbol.key) blocks.push(color(symbol.key), paint.grey.dim.bold(` from `), color.dim(translatedKey))
  else blocks.push(color(symbol.key))

  // 3. Paint environment value if present
  if (environment && (isPresentInEnvironment || hasFallback)) {
    const data = environment.get(symbol.key, { includesFallback: true })
    let value = data.getValue(null, { symbol })
    if (isFunction(value)) value = `${data.entry.name}(...) {...}`

    blocks.push(paint.grey.dim(` (${value})`))
  }

  return blocks
}

/** Explain all symbols in table */
export function explainSymbolTable(symbolTable: SymbolTable, options: SimbolExplainOptions = {}): Block[][] {
  const symbols = [...symbolTable._.symbols.byKey.values()]
  const lines = symbols.map(symbol => symbol.explain(options)).filter(blocks => blocks.length > 0)
  return lines as Block[][]
}
