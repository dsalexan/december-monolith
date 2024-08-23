import { flow } from "fp-ts/lib/function"

import { BasePattern } from "@december/utils/match/base"
import { EQUALS } from "@december/utils/match/value"
import { CONTAINS } from "@december/utils/match/set"
import { AND, OR } from "@december/utils/match/logical"
import { TYPE, NODE } from "../../match/pattern"

import { NodeReplacementSystem } from "../../nrs"
import { MatchState, StateRuleMatch, Rule, match, get, offspring, position, offspringAt, getChild, firstChild, leftOperand, rightOperand } from "../../nrs/rule"
import { KEEP_NODE, REMOVE_NODE } from "../../nrs/system"
import { NIL, SIGNED_NUMBER, STRING_COLLECTION } from "../../type/declarations/literal"
import assert from "assert"
import Node from "../../node"

export const BASE_RULESET: Rule[] = []

// 0. Ignore whitespaces in any non-string context
BASE_RULESET.push(
  new Rule( //
    [state => flow(match(state)(AND<BasePattern>(TYPE.NAME(EQUALS(`whitespace`)), NODE.SCOPE(CONTAINS(`string`, true)))))],
    node => REMOVE_NODE,
  ),
)

// 1. Collapse no/single child lists
BASE_RULESET.push(
  new Rule( //
    [state => flow(match(state)(TYPE.NAME(EQUALS(`list`))))],
    node => {
      if (node.children.length > 1) return KEEP_NODE

      assert(node.tokens.length === 0, `List should not have tokens`)

      const child = node.children.length > 0 ? node._removeChildAt(0) : node.NIL()
      child.attributes.originalNodes = [...(node.attributes.originalNodes ?? [])]

      return child
    },
  ),
)

// 2. collapse quotes into a string
BASE_RULESET.push(
  new Rule( //
    [state => flow(match(state)(TYPE.NAME(EQUALS(`quotes`))))],
    node => {
      if (node.children.length === 0) {
        // TODO: How to collapse empty string?
        return KEEP_NODE
      }

      const WITH_QUOTES = false

      const tokenized = node.tokenize()
      const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
      const tokens = WITH_QUOTES ? allTokens : allTokens.slice(1, -1)

      const string = new Node(tokens[0])
      string.setType(STRING_COLLECTION)

      string.addToken(tokens.slice(1))

      return string
    },
  ),
)

// 3. Transform nil addition/subtraction into signed literal:number
BASE_RULESET.push(
  new Rule( //
    [
      state => flow(match(state)(OR(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`subtraction`))))), // "+" or "-"
      state => flow(leftOperand, match(state)(TYPE.NAME(EQUALS(`nil`)))), // nil
    ],
    node => {
      const [left, right] = node.children

      assert(node.tokens.length === 1, `Addition/Subtraction should have only one token`)

      const signed = new Node(node.tokens[0])
      signed.setType(SIGNED_NUMBER)

      signed.addToken(right.tokens)

      return signed
    },
  ),
)

const NRS = new NodeReplacementSystem()
NRS.addRuleSet(BASE_RULESET)

export default NRS
