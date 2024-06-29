import { toSuperscript } from "@december/utils"

import { SyntaxRestrictionManager, SyntaxRestrictionMap } from "./restriction"
import { SyntaxName } from "./manager"
import { isArray } from "lodash"

export const TYPES = [`primitive`, `enclosure`, `separator`, `pattern`] as const
export type Type = (typeof TYPES)[number]

export interface SyntaxOptions {
  priority?: number
  restrictions?: SyntaxRestrictionMap
  tags?: string[] | string
}

export interface SyntaxClone {
  name: string
  prefix: string
  options: SyntaxOptions
}

export interface SyntaxSymbolOptions {
  tags: string[] | string
  restrictions: SyntaxRestrictionMap
  priority: number
}

export interface SyntaxReference<TSyntax extends SyntaxName | string = SyntaxName | string> {
  syntax: TSyntax // syntax name
  symbol?: string // symbol key
}

export interface SyntaxTypeSet<TSyntax extends SyntaxName | string = SyntaxName | string> {
  type: Type
  /**
   * any: doesn't matter if some or all or none of the syntaxes match, as long as the TYPE matches
   * at_least_one: some (at least one) of the syntaxes must match
   * none: none of the syntaxes must match
   */
  rule: `any` | `at_least_one` | `none`
  syntaxes: SyntaxReference<TSyntax>[]
}

/**
 * pattern; how to match a symbol, how to determine if a node is a symbol/syntax
 *
 *  - string: exact match to node value (TODO: Is it value or repr? Cant be repr(), right? Like, the tree is not ready ready yet)
 *  - RegExp: match to node value (or repr(), see above)
 *  - syntax: match syntax/symbol to node (regardless of value)
 *  - type set: match a subset of syntaxes under a specific type (can specify multiple syntaxes or any/at_least_one/none of them)
 *  - tags: match tags in node syntax
 */
export type SyntaxSymbolPattern = string | RegExp | SyntaxReference<SyntaxName> | SyntaxTypeSet<SyntaxName> | { tags: string[] }

export class SyntaxSymbol<TPattern extends SyntaxSymbolPattern = SyntaxSymbolPattern> {
  key: string
  symbol_OLD: string | RegExp
  patterns: TPattern[]

  tags: string[] = []
  restrictions: SyntaxRestrictionManager
  priority?: number // priority modifier for symbol

  constructor(key: string, pattern: TPattern | TPattern[], options: Partial<SyntaxSymbolOptions> = {}) {
    this.key = key

    // we store patterns as an array regardless
    this.patterns = isArray(pattern) ? pattern : [pattern]

    this.restrictions = new SyntaxRestrictionManager()

    if (options.restrictions) this.restrictions.add(options.restrictions)
    if (options.tags) this.tags = Array.isArray(options.tags) ? [...options.tags] : [options.tags]
    if (options.priority !== undefined) this.priority = options.priority
  }
}

export class Syntax<TPattern extends SyntaxSymbolPattern = SyntaxSymbolPattern> {
  options: SyntaxOptions // keeping it just to facilitate cloning

  type: Type
  name: string

  prefix: string
  priority?: number // priority is only relevant when reorganizing child nodes, highest priority is reorganized first
  tags: string[] = []

  // restrictions: {
  //   // escape parsing when one of these recipes is found inside // TODO: WTF this means????
  //   children: string[] // escapeChildren

  //   // only parse if parent node is one of these recipes
  //   parents: string[] // allowedParents
  //   grandparents: string[] // TODO: Ncessary?
  // }
  restrictions: SyntaxRestrictionManager

  symbols: SyntaxSymbol<TPattern>[]

  constructor(type: Type, name: string, prefix: string, options: SyntaxOptions = {}) {
    const {
      priority = undefined, //
      restrictions,
      tags = [],
    } = options

    this.options = options

    this.type = type
    this.name = name

    this.prefix = prefix

    this.restrictions = new SyntaxRestrictionManager()

    if (priority !== undefined) this.priority = priority
    if (restrictions) this.restrictions.add(restrictions)
    if (tags) this.tags = Array.isArray(tags) ? [...tags] : [tags]

    // this.restrictions = {
    //   children: [...children],
    //   parents: [...parents],
    //   grandparents: [...grandparents],
    // }

    this.symbols = []
  }

  static flatten(reference: SyntaxReference) {
    return `${reference.syntax}${reference.symbol ? `:${reference.symbol}` : ``}`
  }

  static unflatten(flattened: string): SyntaxReference {
    const [syntax, symbol] = flattened.split(`:`)

    const o = { syntax } as SyntaxReference

    if (symbol) o.symbol = symbol

    return o
  }

  toReference(symbol: string): SyntaxReference {
    return { syntax: this.name, symbol }
  }

  getSymbol(key: string) {
    return this.symbols.find(symbol => symbol.key === key)
  }

  // #region Cloning

  // NOTE: To my understanding, "cloning" is to be used to create specialized recipes (like IF, ELSE, then, etc????)

  get base() {
    const name = this.name.split(`_`)

    return name[0]
  }

  get clonedFrom() {
    const name = this.name.split(`_`)
    const clonings = name.length - 1

    return name.slice(0, clonings).join(`_`)
  }

  /**
   * Some syntax recipes have a "clone" function, to facilitate specialization of recipes for different purposes
   */
  _clone(name: string, variant: number, newOptions: SyntaxOptions = {}): SyntaxClone {
    const options: SyntaxOptions = {}
    if (this.priority !== undefined) options[`priority`] = this.priority
    if (this.tags.length > 0) options[`tags`] = [...this.tags]

    if (this.restrictions.count > 0) options[`restrictions`] = this.restrictions.toMap()

    return {
      name: `${this.name}_${name}`,
      prefix: `${this.prefix}${toSuperscript(variant)}`,
      options: { ...options, ...newOptions },
    }
  }

  // #endregion
}
