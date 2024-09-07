/**
 * A Lexical Grammar is the collection of rules to match lexemes in a source text (expression) for the lexical analysis
 */

import { assert } from "console"
import { filter, identity, orderBy } from "lodash"
import { TypeName } from "./declarations/name"
import Type from "./base"

import { Interval } from "@december/utils"

import { RuleSet } from "../nrs/rule/rule"
import Node from "../node"

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

  /** Matches a sequence of characters to a lexical type. It is "lexical" by default (requires no tree structure, just the lexeme) */
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
    // const sorted = orderBy(matches, [`lexical.priority`], [`desc`])
    const sorted = Type.orderByPriority(`lexical`, matches, [identity], [`desc`])

    return sorted
  }

  /** Matches a sequence of characters to a lexical type, BUT within a syntactical context (a "tree") */
  syntacticalMatch(sequence: string, tree: Node): Type[] {
    const matches: Type[] = []

    // get all types with lexical patterns
    let types = [...this.types.values()].filter(type => type.lexical && type.lexical.patterns.length > 0)

    for (const type of types) {
      const lexical = type.lexical!
      const [pattern] = lexical.patterns

      // ERROR: Unimplemented many patterns
      assert(lexical.patterns.length === 1, `Unimplemented multiple patterns`)

      if (pattern.match(sequence)) matches.push(type)
    }

    // sort by priority (lower is worse)
    const sorted = Type.orderByPriority(`syntactical`, matches, [identity], [`desc`])

    // filter by tree pattern (if it exists)
    const filtered: Type[] = []
    for (const type of sorted) {
      const pattern = type.syntactical.pattern
      if (pattern === undefined) filtered.push(type)
      else if (pattern.match(tree)) filtered.push(type)
    }

    return filtered
  }

  getRuleSets(): RuleSet[] {
    const types = [...this.types.values()]
    const semanticalTypes = filter(types, type => !!type.semantical?.ruleset)
    // const sorted = orderBy(semanticalTypes, [`semantical.priority`], [`desc`])
    const sorted = Type.orderByPriority(`semantical`, semanticalTypes, [identity], [`desc`])

    return sorted.map(type => type.semantical!.ruleset!)
  }

  clone(types: Type[] = []) {
    const grammar = new Grammar()

    for (const type of this.types.values()) grammar.add(type)
    grammar.add(...types)

    return grammar
  }

  print() {
    const types = [...this.types.values()]
    // const sorted = orderBy(types, [`lexical.priority`], [`asc`])
    // const sorted = Type.orderByPriority(`lexical`, types, [identity], [`asc`])
  }
}
