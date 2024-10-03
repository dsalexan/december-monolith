/**
 * A Lexical Grammar is the collection of rules to match lexemes in a source text (expression) for the lexical analysis
 */

import { assert } from "console"
import { filter, identity, orderBy } from "lodash"
import { TypeName } from "./declarations/name"
import Type from "./base"

import { Interval } from "@december/utils"
import { UnitManager } from "@december/utils/unit"

import { RuleSet } from "../nrs"
import Node from "../node"
import LexicalRule from "./rules/lexical"
import { MatchFunction, MatchOptions, MatchResult, TrueMatchResult } from "../phases/lexer/match"

export type TypedMatchResult = { type: Type } & TrueMatchResult

export default class Grammar {
  types: Map<TypeName, Type>
  unitManager: UnitManager

  constructor(unitManager: UnitManager) {
    this.types = new Map()
    this.unitManager = unitManager
  }

  add(...types: Type[]) {
    for (const type of types) this.types.set(type.name, type)

    return this
  }

  /** Returns lexical type from name */
  get(name: TypeName) {
    return this.types.get(name)
  }

  /** Matches a sequence of characters to a lexical type. It is "lexical" by default (requires no tree structure, just the lexeme) */
  match(sequence: string, fn?: (type: Type) => boolean): TypedMatchResult[] {
    const matchOptions: MatchOptions = {
      unitManager: this.unitManager,
    }

    const matches: TypedMatchResult[] = []

    // get all types with lexical patterns
    let types = [...this.types.values()].filter(type => type.lexical)

    // filter types if necessary
    if (fn) types = types.filter(fn)

    for (const type of types) {
      const match = type.lexical!.match(type, sequence, matchOptions)
      if (match.value) matches.push({ type, ...match })
    }

    // sort by priority (lower is worse)
    // const sorted = orderBy(matches, [`lexical.priority`], [`desc`])
    const sorted = Type.orderByPriority(`lexical`, matches, [({ type }) => type], [`desc`])

    return sorted
  }

  /** Matches a sequence of characters to a lexical type, BUT within a syntactical context (a "tree") */
  syntacticalMatch(sequence: string, tree: Node): TypedMatchResult[] {
    const matchOptions: MatchOptions = {
      unitManager: this.unitManager,
    }

    const matches: TypedMatchResult[] = []

    // get all types with lexical patterns
    let types = [...this.types.values()].filter(type => type.lexical)

    for (const type of types) {
      const match = type.lexical!.match(type, sequence, matchOptions)
      if (match.value) matches.push({ type, ...match })
    }

    // sort by priority (lower is worse)
    const sorted = Type.orderByPriority(`syntactical`, matches, [({ type }) => type], [`desc`])

    // filter by tree pattern (if it exists)
    const filtered: TypedMatchResult[] = []
    for (const match of sorted) {
      const pattern = match.type.syntactical!.pattern
      if (pattern === undefined) filtered.push(match)
      else if (pattern.match(tree)) filtered.push(match)
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
    const grammar = new Grammar(this.unitManager)

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
