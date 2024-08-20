import assert from "assert"

import type Node from "../../../node"

import { flow } from "fp-ts/lib/function"
import { EQUALS } from "@december/utils/match/value"
import { TYPE } from "../../../match/pattern"

export { default as NodeReplacementSystem } from "./system"

import { MatchState, StateRuleMatch, Rule, match, get, offspring, position } from "./rule"
import { re } from "mathjs"

// 0 + SUBTREE -> SUBTREE

const _ADDITION: StateRuleMatch = (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`addition`))))

const _0: StateRuleMatch = (state: MatchState) =>
  flow(
    get(state)(0), //
    offspring(1),
    position(0),
    match(state)(TYPE.ID(EQUALS(`literal:number`))),
  )

const RULE_0 = new Rule([_ADDITION, _0], node => node.children[1])

export const BASE_RULESET = [RULE_0]
