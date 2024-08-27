import { flow } from "fp-ts/lib/function"
import assert from "assert"

import { Range } from "@december/utils"
import { BasePattern } from "@december/utils/match/base"
import { EQUALS } from "@december/utils/match/value"
import { CONTAINS, NOT_CONTAINS } from "@december/utils/match/set"
import { AND, OR } from "@december/utils/match/logical"

import Node from "../../node"
import { NIL, SIGNED_NUMBER, STRING_COLLECTION } from "../../type/declarations/literal"
import { FUNCTION } from "../../type/declarations/composite"
import { IDENTIFIER } from "../../type/declarations/identifier"

import { TYPE, NODE } from "../../match/pattern"

import { NodeReplacementSystem } from "../../nrs"
import { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT } from "../../nrs/system"
import { Rule, leftOperand, match, matchInChildren, nextSibling, predicate, filter, ADD_NODE_AT } from "../../nrs/rule"
import { RuleMatch } from "../../nrs/rule/match"
import { RuleSet } from "../../nrs/rule/rule"

const RULESET = new RuleSet()

// 0. Ignore whitespaces in any non-string context
RULESET.add(
  match(AND<BasePattern>(TYPE.NAME(EQUALS(`whitespace`)), NODE.SCOPE(NOT_CONTAINS(`string`)))), //
  node => REMOVE_NODE,
)

// 1. Collapse no/single child lists
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`list`))),
    predicate(node => node.children.length <= 1),
  ),
  node => {
    // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    assert(node.tokens.length === 0, `List should not have tokens`)

    const child = node.children.length > 0 ? node._removeChildAt(0) : node.NIL()
    child.attributes.originalNodes = [...(node.attributes.originalNodes ?? [])]

    return child
  },
)

// 2. collapse quotes into a string
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`quotes`))), //
    predicate(node => node.children.length > 0), // TODO: How to collapse empty string?
  ),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    const WITH_QUOTES = false

    // TODO: Use collapse centralized function
    const tokenized = node.tokenize()
    const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
    const tokens = WITH_QUOTES ? allTokens : allTokens.slice(1, -1)

    const string = new Node(tokens[0])
    string.setType(STRING_COLLECTION)

    string.addToken(tokens.slice(1))

    return string
  },
)

// 3. Transform nil addition/subtraction into signed literal:number
RULESET.add(
  flow(
    match(OR(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`subtraction`)))), // "+" or "-"
    leftOperand,
    match(TYPE.NAME(EQUALS(`nil`))), // nil(left-operand)
  ),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    const [left, right] = node.children

    assert(node.tokens.length === 1, `Addition/Subtraction should have only one token`)

    const signed = new Node(node.tokens[0])
    signed.setType(SIGNED_NUMBER)

    signed.addToken(right.tokens)

    return signed
  },
)

// 4. COMPOSITE FUNCTION TEST
RULESET.add(
  // originalNode === parent
  flow(
    matchInChildren(TYPE.NAME(EQUALS(`string`))), // function name
    filter(
      flow(
        nextSibling,
        match(TYPE.NAME(EQUALS(`parenthesis`))), // next IS parenthesis
      ),
    ),
  ),
  (node, matchState) => {
    // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    assert(matchState.matches.length === 1, `Unsure how to handle this`)

    const [{ out, match }] = matchState.matches
    const [result] = out! as Node[]

    assert(result instanceof Node, `Result should be a node (the string node, by the way)`)

    const index = result.index

    const string = result
    const parenthesis = nextSibling(result)!

    const fallbackRange = Range.fromOffsetPoints([string.range.column(`first`), parenthesis.range.column(`last`)], 0.5)
    const fn: Node = new Node(FUNCTION, fallbackRange)

    fn.setAttributes({ originalNodes: [string.clone(), parenthesis.clone()], reorganized: true })

    string
      ._addToParent(fn, null, true)
      .setAttributes({ tags: [`name`] })
      .setType(IDENTIFIER)

    // all arguments of a function are its [1, N] children (there is no seed for a parenthesis)
    // parenthesis._addToParent(fn, null, true).setAttributes({ tags: [`arguments`] })
    assert(parenthesis.tokens.length === 2, `Unimplemented for enclosure with anything but 2 tokens`)

    // properly format tokens (for traversal)
    const [opener, closer] = parenthesis.tokens
    opener.attributes.traversalIndex = 1
    closer.attributes.traversalIndex = -1

    fn.addToken([opener, closer])

    assert(parenthesis.children.length <= 1, `Unimplemented for enclosure with multiple children`)

    if (parenthesis.children.length === 1) {
      const child = parenthesis.children[0]

      if (child.type.id !== `separator`) child._addToParent(fn, null, true).setAttributes({ tags: [`argument`] })
      else if (child.type.name === `comma`) {
        // inject comma tokens
        const commas = child.tokens
        for (const [i, comma] of commas.entries()) comma.attributes.traversalIndex = i + 1
        fn.addToken(commas)

        const grandchildren = [...child.children]
        for (const grandchild of grandchildren) grandchild._addToParent(fn, null, true).setAttributes({ tags: [`argument`] })
      } else debugger

      // TODO: Think a better way to handle this. This kills the immutability of the Semantic NRS
      node._removeChildAt(parenthesis.index, true)
    }

    return ADD_NODE_AT(fn, index)
  },
)

// // 0. Ignore whitespaces in any non-string context
// BASE_RULESET.push(
//   new Rule( //
//     [state => flow(match(state)(AND<BasePattern>(TYPE.NAME(EQUALS(`whitespace`)), NODE.SCOPE(CONTAINS(`string`, true)))))],
//     node => REMOVE_NODE,
//   ),
// )

// // 1. Collapse no/single child lists
// BASE_RULESET.push(
//   new Rule( //
//     [state => flow(match(state)(TYPE.NAME(EQUALS(`list`))))],
//     node => {
//       if (node.children.length > 1) return KEEP_NODE

//       assert(node.tokens.length === 0, `List should not have tokens`)

//       const child = node.children.length > 0 ? node._removeChildAt(0) : node.NIL()
//       child.attributes.originalNodes = [...(node.attributes.originalNodes ?? [])]

//       return child
//     },
//   ),
// )

// // 2. collapse quotes into a string
// BASE_RULESET.push(
//   new Rule( //
//     [state => flow(match(state)(TYPE.NAME(EQUALS(`quotes`))))],
//     node => {
//       if (node.children.length === 0) {
//         // TODO: How to collapse empty string?
//         return KEEP_NODE
//       }

//       const WITH_QUOTES = false

//       const tokenized = node.tokenize()
//       const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
//       const tokens = WITH_QUOTES ? allTokens : allTokens.slice(1, -1)

//       const string = new Node(tokens[0])
//       string.setType(STRING_COLLECTION)

//       string.addToken(tokens.slice(1))

//       return string
//     },
//   ),
// )

// // 3. Transform nil addition/subtraction into signed literal:number
// BASE_RULESET.push(
//   new Rule( //
//     [
//       state => flow(match(state)(OR(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`subtraction`))))), // "+" or "-"
//       state => flow(leftOperand, match(state)(TYPE.NAME(EQUALS(`nil`)))), // nil
//     ],
//     node => {
//       const [left, right] = node.children

//       assert(node.tokens.length === 1, `Addition/Subtraction should have only one token`)

//       const signed = new Node(node.tokens[0])
//       signed.setType(SIGNED_NUMBER)

//       signed.addToken(right.tokens)

//       return signed
//     },
//   ),
// )

// // 4. COMPOSITE FUNCTION TEST
// BASE_RULESET.push(
//   new Rule(
//     [
//       state =>
//         flow(
//           ,  //
//           match(state)(TYPE.NAME(EQUALS(`function`))),
//         ),
//     ],
//     node => {
//       debugger
//       return KEEP_NODE
//     },
//   ),
// )

const NRS = new NodeReplacementSystem()
NRS.addRuleSet(RULESET)

export default NRS
