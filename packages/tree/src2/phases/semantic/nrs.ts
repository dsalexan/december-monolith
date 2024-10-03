import { flow } from "fp-ts/lib/function"
import assert from "assert"

import { Range } from "@december/utils"
import { IUnit, Quantity } from "@december/utils/unit"
import { BasePattern } from "@december/utils/match/base"
import { EQUALS } from "@december/utils/match/element"
import { CONTAINS, NOT_CONTAINS } from "@december/utils/match/set"
import { AND, OR } from "@december/utils/match/logical"

import Node, { NodeFactory } from "../../node"
import { NIL, NUMBER, QUANTITY, STRING, STRING_COLLECTION } from "../../type/declarations/literal"
import { FUNCTION } from "../../type/declarations/enclosure"
import { IDENTIFIER } from "../../type/declarations/identifier"
import { SIGN } from "../../type/declarations/operator"

import { TYPE, NODE, NodePattern } from "../../match/pattern"

import { RuleSet } from "../../nrs/ruleset"

import { filter, leftOperand, match, matchInChildren, nextSibling, predicate, previousSibling, type } from "../../nrs/rule/match/functions"
import { ADD_NODE_AT, COLLAPSE_NODE, COMPLEX_MUTATION, MOVE_NODE_TO, REMOVE_NODE } from "../../nrs/rule/mutation/instruction"
import { NodeTokenizedWord_Node } from "../../node/node/token"
import { RuleMatch } from "../../nrs/rule/match"

export const RULESET_SEMANTIC = new RuleSet(`semantic`)

// Ignore whitespaces in any non-string context
RULESET_SEMANTIC.add(
  `ignore-whitespace`,
  match(AND<NodePattern>(TYPE.NAME(EQUALS(`whitespace`)), NODE.SCOPE(NOT_CONTAINS(`string`)))), //
  node => REMOVE_NODE(),
)

// Collapse no/single child lists
RULESET_SEMANTIC.add(
  `collapse-lists`, //
  flow(
    type(`name`, `list`),
    predicate(node => node.children.length <= 1),
  ),
  node => {
    assert(node.tokens.length === 0, `List should not have tokens`)

    const child = node.children.length > 0 ? node.children.remove(0) : NodeFactory.NIL(node)
    child.attributes.originalNodes = [...(node.attributes.originalNodes ?? [])]

    return child
  },
)

// Collapse quotes into a string collection
RULESET_SEMANTIC.add(
  `collapse-quotes`, //
  flow(type(`name`, `quotes`)),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    assert(node.children.length === 0, `How to collapse empty strings?`)

    const WITH_QUOTES = false

    // TODO: Use collapse centralized function
    const tokenized = node.tokenize() as NodeTokenizedWord_Node[]
    const _tokenized = tokenized.map(({ node, token }) => (token ? token.lexeme : node.lexeme))

    const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
    const tokens = WITH_QUOTES ? allTokens : allTokens.slice(1, -1)

    const string = NodeFactory.STRING_COLLECTION(tokens)

    return string
  },
)

// Aggregate literal + unit into quantity
RULESET_SEMANTIC.add(
  `quantity`, //
  [
    new RuleMatch(
      flow(
        matchInChildren(TYPE.NAME(EQUALS(`unit`))), // literally the unit of measurement
        filter(
          flow(
            previousSibling,
            type(`module`, `quantity:numerical-value`), // usually NUMBER or STRING (anything eligible for a quantity's numerical value by module)
          ),
        ),
      ),
      { optional: true },
    ),
    new RuleMatch(
      flow(
        type(`name`, `unit`),
        predicate(node => {
          const unitToken = node.tokens[0]
          const unit = unitToken.attributes.value as IUnit

          return unit.accepts(`missing-value`)
        }),
      ),
      { optional: true },
    ),
  ],
  (node, matchState) => {
    // All shit here have "{ refreshIndexing: false }" because there is no root to refresh indexing from (yet)

    const isI = matchState.matches[0].value
    const isII = matchState.matches[1].value

    const { out, match } = isI ? matchState.matches[0] : matchState.matches[1]

    if (isI) assert((out! as Node[]).length === 1, `Unsure how to handle this`)

    const result = isI ? (out! as Node[])[0] : (out as Node)

    assert(result instanceof Node, `Result should be a node (the unit node, by the way)`)

    if (isI) {
      const unit = result
      const numericalValue = previousSibling(result)!

      const quantity = NodeFactory.QUANTITY(unit)
      quantity.setAttributes({ originalNodes: [numericalValue.clone(), unit.clone()], reorganized: true })

      return MOVE_NODE_TO(quantity, numericalValue, 0, `ignore`)
    } else {
      const unit = result

      const quantity = NodeFactory.QUANTITY(unit)
      quantity.setAttributes({ originalNodes: [unit.clone()], reorganized: true })

      return quantity

      const numericalValue = NodeFactory.PRIMITIVE(1, NUMBER)

      return MOVE_NODE_TO(quantity, numericalValue, 0, `ignore`)
    }
  },
)

// Collapse isolated units
RULESET_SEMANTIC.add(
  `collapse-units`, //
  flow(type(`name`, `unit`)),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    node.setType(STRING)

    return node
  },
)

// `q -> _1q`
// (Create numeric value ONE for missingValue quantities)
RULESET_SEMANTIC.add(
  `q -> _1q`, //
  flow(
    type(`name`, `quantity`), // "+" or "-"
    predicate(node => {
      const unit = node.attributes.unit!

      return unit.accepts(`missing-value`) && node.children.length === 0
    }),
  ),
  node => {
    const value = NodeFactory.PRIMITIVE(1, NUMBER)

    return ADD_NODE_AT(value, 0)
  },
)

// `-_1q -> (-_1)q`
// (Transfer sign to quantity's value)
RULESET_SEMANTIC.add(
  `-_1q -> (-_1)q`, //
  flow(
    type(`name`, `sign`), // "+" or "-"
    flow(leftOperand, match(TYPE.NAME(EQUALS(`quantity`)))), // left === quantity
  ),
  node => {
    const signToken = node.tokens[0]
    const sign = signToken.lexeme === `-` ? -1 : 1

    const quantity = node.children.get(0)
    const value = quantity.children.get(0)

    // 1. Update quantity's fallback range and remove value
    quantity.updateFallbackRange(node.range)
    quantity.children.remove(value.index, { refreshIndexing: false })

    // 2. Create new sign node and add value (previously removed) here
    const newSign = NodeFactory.SIGN(signToken)
    newSign.children.add(value, null, { refreshIndexing: false })

    // 3. Add new sign as quantity's value
    quantity.children.add(newSign, null, { refreshIndexing: false })

    return quantity
  },
)

// Transform nil addition/subtraction into operator:sign
RULESET_SEMANTIC.add(
  `signed-number`, //
  flow(
    match(OR(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`subtraction`)))), // "+" or "-"
    leftOperand,
    type(`name`, `nil`), // nil(left-operand)
  ),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    const [left, right] = node.children.nodes

    assert(node.tokens.length === 1, `Addition/Subtraction should have only one token`)

    node.setType(SIGN)
    node.children.remove(0) // remove nil

    return node
  },
)

// Compose basic function struction (name + arguments)
RULESET_SEMANTIC.add(
  `compose-function`, //
  // originalNode === parent
  flow(
    matchInChildren(TYPE.NAME(EQUALS(`string`))), // function name
    filter(
      flow(
        nextSibling,
        type(`name`, `parenthesis`), // next IS parenthesis
      ),
    ),
  ),
  (node, matchState) => {
    // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    // All shit here have "{ refreshIndexing: false }" because there is no root to refresh indexing from (yet)

    const [{ out, match }] = matchState.matches

    assert((out! as Node[]).length === 1, `Unsure how to handle this`)

    const [result] = out! as Node[]

    assert(result instanceof Node, `Result should be a node (the string node, by the way)`)

    const index = result.index

    const string = result
    const parenthesis = nextSibling(result)!

    // 1. Create Function node
    const fallbackRange = Range.fromOffsetPoints([string.range.column(`first`), parenthesis.range.column(`last`)], 0.5)
    const fn: Node = NodeFactory.FUNCTION(fallbackRange)

    fn.setAttributes({ originalNodes: [string.clone(), parenthesis.clone()], reorganized: true })

    // 2. Add name node
    string.setAttributes({ tags: [`name`] }).setType(IDENTIFIER)
    fn.children.add(string, null, { refreshIndexing: false })

    // all arguments of a function are its [1, N] children (there is no seed for a parenthesis)
    // parenthesis._addToParent(fn, null, true).setAttributes({ tags: [`arguments`] })
    assert(parenthesis.tokens.length === 2, `Unimplemented for enclosure with anything but 2 tokens`)

    // 3. Properly format () tokens for traversal
    const [opener, closer] = parenthesis.tokens
    opener.attributes.traversalIndex = 1
    closer.attributes.traversalIndex = -1

    fn.addToken([opener, closer])

    // 3. Add argument nodes
    const child = parenthesis.children.nodes[0]

    const childrenAreArguments = parenthesis.children.length > 1 || child.type.id !== `separator`

    if (childrenAreArguments)
      while (parenthesis.children.length) {
        const child = parenthesis.children.nodes[0]

        child.setAttributes({ tags: [`argument`] })
        fn.children.add(child, null, { refreshIndexing: false })
      }
    else {
      // (parenthesis > child)
      // child is a separator, ergo its children should be the arguments

      if (child.type.name === `comma`) {
        // inject comma tokens into function node (for printing purposes)
        const commas = child.tokens
        for (const [i, comma] of commas.entries()) comma.attributes.traversalIndex = i + 1
        fn.addToken(commas)

        const grandchildren = [...child.children.nodes]
        for (const grandchild of grandchildren) {
          grandchild.setAttributes({ tags: [`argument`] })
          fn.children.add(grandchild, null, { refreshIndexing: false })
        }
      } else throw new Error(`Unsure how to handle a parenthesis with single child "${child.type.getFullName()}"`)
    }

    // TODO: Think a better way to handle this. This kills the immutability of the Semantic NRS
    node.children.remove(parenthesis.index, { refreshIndexing: false })

    return ADD_NODE_AT(fn, index, `ignore`)
  },
)
