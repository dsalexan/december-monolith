import { compose } from "fp-ts/lib/pipeable"
import { matchNode, type NodePattern } from "../../match/pattern"
import type Node from "../../node"

import { Match } from "@december/utils"
import { flow } from "fp-ts/lib/function"
import assert from "assert"

export default class NodeReplacementSystem {
  ruleset: Rule[]

  constructor() {
    this.ruleset = []
  }

  addRule(rule: Rule) {
    this.ruleset.push(rule)
  }

  exec(originalNode: Node) {
    let changes: { rule: Rule; state: MatchState }[] = []
    let node: Node = originalNode

    for (const [i, rule] of this.ruleset.entries()) {
      const match = rule.match(node)

      if (match._matches.length > 0) {
        changes.push({ rule, state: match })
        node = rule.replace(node, match)
      }
    }

    return changes.length > 0 ? node : null
  }
}

interface MatchState {
  _matches: { name?: string; pattern: NodePattern; node: Node }[]
  matches: Record<string, number> // match name => index at _matches
}

type StateReliant<T> = (state: MatchState) => T

type TNodePattern_Match = (pattern: NodePattern, name?: string) => (node: Node) => Node | null
type TNodePattern_Filter = (pattern: NodePattern) => (nodes: Node[]) => Node[]

const match: StateReliant<TNodePattern_Match> = state => (pattern, name) => node => {
  const isMatch = matchNode(node, pattern)

  // registering match in state
  if (isMatch) {
    state._matches.push({ name, pattern, node })
    if (name) state.matches[name] = state._matches.length - 1
  }

  return isMatch ? node : null
}
const filter: TNodePattern_Filter = pattern => nodes => nodes.filter(node => matchNode(node, pattern))

type TOffspring = (level: number) => (node: Node) => Node[]
type TAncestor = (level: number) => (node: Node) => Node | null
type TPosition = (position: number) => (nodes: Node[]) => Node | null

const offspring: TOffspring = level => node => node.offspring(level)
const ancestor: TAncestor = level => node => node.ancestor(level)
const position: TPosition = position => nodes => nodes[position]

type TMatch_Index = (index: number) => (node: Node) => Node | null
type TMatch_Name = (name: string) => (node: Node) => Node | null

const get: StateReliant<TMatch_Index> = state => index => node => state._matches[index]?.node ?? null
const getName: StateReliant<TMatch_Name> = state => name => node => state._matches[state.matches[name]]?.node ?? null

export type RuleMatch = (node: Node) => any

// 0 + SUBTREE -> SUBTREE

const _ADDITION: StateReliant<RuleMatch> = (state: MatchState) =>
  flow(
    match(state)({
      target: `type:name`,
      pattern: {
        type: `equals`,
        value: `addition`,
      },
    }),
  )

const _0: StateReliant<RuleMatch> = (state: MatchState) =>
  flow(
    //
    get(state)(0),
    offspring(1),
    position(0),
    match(state)({
      target: `type:id`,
      pattern: {
        type: `equals`,
        value: `literal:number`,
      },
    }),
  )

type RuleReplacement = (node: Node, match: MatchState) => Node

export class Rule {
  matching: StateReliant<RuleMatch>[]
  replacement: RuleReplacement

  constructor(matching: StateReliant<RuleMatch>[], replacement: RuleReplacement) {
    this.matching = matching
    this.replacement = replacement
  }

  match(node: Node): MatchState {
    const state: MatchState = {
      _matches: [],
      matches: {},
    }

    for (const match of this.matching) match(state)(node)

    return state
  }

  replace(node: Node, match: MatchState): Node {
    assert(match._matches.length > 0, `There should not be a replacement without a match`)

    const newNode = this.replacement(node, match)

    debugger

    return newNode
  }
}

const RULE_0 = new Rule([_ADDITION, _0], node => {
  debugger
  return null as any
})
