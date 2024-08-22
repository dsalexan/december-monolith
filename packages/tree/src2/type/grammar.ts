/**
 * A Lexical Grammar is the collection of rules to match lexemes in a source text (expression) for the lexical analysis
 */

import { assert } from "console"
import { filter, orderBy } from "lodash"
import { TypeName } from "./declarations/name"
import Type from "./base"

import type Node from "../node"
import { SemanticalMatch } from "./rules/semantical"

export default class Grammar {
  types: Map<TypeName, Type>
  typesByModule: Map<string, TypeName[]>

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

      if (pattern.match(sequence)) matches.push(type)
    }

    // sort by priority (lower is worse)
    const sorted = orderBy(matches, [`priority`], [`desc`])

    return sorted
  }

  matchSemantical(parent: Node, children: Node[]) {
    const _types = [...this.types.values()]
    const types = filter(_types, (type: Type) => !!type.semantical?.match)

    const matches: { type: Type; result: ReturnType<SemanticalMatch> }[] = []
    for (const type of types) {
      assert(type.semantical?.match, `Type lacks semantical (or semantical match)`)

      const { match } = type.semantical!

      const result = match!(parent, children)
      if (result) matches.push({ type, result })
    }

    // sort matches
    const sortedMatches = orderBy(matches, ({ type }) => type.semantical!.priority, `desc`)

    return sortedMatches
  }

  print() {
    const types = this.types.values()
    const sorted = orderBy(types, [`priority`], [`asc`])
  }
}
