/**
 * A Lexical Grammar is the collection of rules to match lexemes in a source text (expression) for the lexical analysis
 */

import { assert } from "console"
import { orderBy } from "lodash"
import { TypeName } from "./declarations/name"
import Type from "./base"
import { match } from "../pattern"

export default class Grammar {
  types: Map<TypeName, Type>

  constructor() {
    this.types = new Map()
  }

  add(...types: Type[]) {
    for (const type of types) this.types.set(type.name, type)
  }

  /** Returns lexical type from name */
  get(name: TypeName) {
    return this.types.get(name)
  }

  /** Matches a sequence of characters to a lexical type */
  match(sequence: string, fn?: (type: Type) => boolean): Type[] {
    const matches: Type[] = []

    // get all types with lexical patterns
    let types = [...this.types.values()].filter(type => type.lexical && type.lexical.patterns.length > 0)

    // filter types if necessary
    if (fn) types = types.filter(fn)

    for (const type of types) {
      const lexical = type.lexical!
      const [pattern] = lexical.patterns

      // ERROR: Unimplemented many patterns
      assert(lexical.patterns.length === 1, `Unimplemented multiple patterns`)

      if (match(sequence, pattern)) matches.push(type)
    }

    // sort by priority (lower is worse)
    const sorted = orderBy(matches, [`priority`], [`desc`])

    return sorted
  }

  print() {
    const types = this.types.values()
    const sorted = orderBy(types, [`priority`], [`asc`])
  }
}
