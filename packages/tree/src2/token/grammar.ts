/**
 * A Lexical Grammar is the collection of rules to match lexemes in a source text (expression) for the lexical analysis
 */

import { assert } from "console"
import type { TokenTypeName } from "./type"
import TokenType, { TokenTypeID } from "./type/base"
import { orderBy } from "lodash"

export default class LexicalGrammar {
  types: Map<TokenTypeName, TokenType>

  constructor() {
    this.types = new Map()
  }

  add(...types: TokenType[]) {
    for (const type of types) this.types.set(type.name, type)
  }

  /** Returns lexical type from name */
  get(name: TokenTypeName) {
    return this.types.get(name)
  }

  /** Matches a sequence of characters to a lexical type */
  match(sequence: string, fn?: (type: TokenType) => boolean): TokenType[] {
    const matches: TokenType[] = []

    // filter types if necessary
    let types = [...this.types.values()]
    if (fn) types = types.filter(fn)

    for (const type of types) {
      let isAMatch = false

      const value = sequence

      if (type.pattern.type === `string`) isAMatch = type.pattern.value === value
      else if (type.pattern.type === `regex`) isAMatch = type.pattern.pattern.test(value)
      else if (type.pattern.type === `list`) isAMatch = type.pattern.values.includes(value)
      else if (type.pattern.type === `none`) isAMatch = false
      else assert(false, `Invalid pattern type`)

      if (isAMatch) matches.push(type)
    }

    const sorted = orderBy(matches, [`priority`], [`asc`])

    return sorted
  }

  /** Teste is a sequence/character is a "whitespace" token */
  testWhitespace(sequence: string) {
    return this.match(sequence, type => type.id === `whitespace`)
  }
}
