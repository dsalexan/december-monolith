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
import { uniq } from "lodash"
import { debugScopeTree } from "../../node/scope"

export const RULESET_SEMANTIC = new RuleSet(`semantic`)

// Ignore whitespaces in any non-string context
RULESET_SEMANTIC.add(
  `ignore-whitespace`,
  flow(
    type(`name`, `whitespace`), //
    match(NODE.SCOPE(NOT_CONTAINS(`textual`))),
  ),
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

    const child = node.children.length > 0 ? node.children.remove(0) : NodeFactory.abstract.NIL(node)
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

    assert(node.children.length !== 0, `How to collapse empty strings?`)

    const WITH_QUOTES = true

    // TODO: Use collapse centralized function
    const tokenized = node.tokenize() as NodeTokenizedWord_Node[]
    const _tokenized = tokenized.map(({ node, token }) => (token ? token.lexeme : node.lexeme))

    const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
    const tokens = WITH_QUOTES ? allTokens : allTokens.slice(1, -1)

    const string = NodeFactory.abstract.STRING_COLLECTION(tokens)
    string.setAttributes({ tags: [`from-quotes`] })

    return string
  },
)

// Collapse LIST into a string collection
RULESET_SEMANTIC.add(
  `collapse-lists-into-string`, //
  flow(
    type(`name`, `list`),
    predicate(node => node.children.length > 1),
    predicate(node => {
      // 1. textual scope
      if (node.getScope().includes(`textual`)) return true

      // 2. Argument of a function
      if (node.parent?.type.name === `function`) {
        const _childrenScopes = node.children.map(child => child.getScope())
        const childrenScopes = uniq(_childrenScopes.flat())

        return childrenScopes.length === 1 && childrenScopes[0] === `textual`
      }

      return false
    }),
    predicate(node => {
      // 1. check if all children are literals
      const childrenTypes = node.children.map(child => child.type)

      const areAllChildrenLiterals = childrenTypes.every(type => type.isLiteralLike() || type.id === `whitespace`)
      if (!areAllChildrenLiterals) return false

      // 2. check if all children are of textual scopes
      const _childrenScopes = node.children.map(child => child.getScope())
      const childrenScopes = uniq(_childrenScopes.flat())

      if (childrenScopes.length !== 1) return false
      // assert(childrenScopes.length === 1, `All children should be of the same scope`)
      assert(!childrenScopes.includes(`derived`), `Children should NOT be of derived scope`)

      const isNonDerivedChildrenScopesTextural = childrenScopes[0] === `textual`
      if (!isNonDerivedChildrenScopesTextural) return false

      // 3. Check if parent scope is non-derived
      const _parentScope = node.parent?.getScope() ?? []
      const parentScope = _parentScope.filter(scope => scope !== `derived`)

      // debugScopeTree(node.root, `contextualized`, true)

      return parentScope.length >= 1
    }),
  ),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    assert(node.children.length !== 0, `How to collapse empty strings?`)

    // TODO: Use collapse centralized function
    const tokenized = node.tokenize() as NodeTokenizedWord_Node[]
    const _tokenized = tokenized.map(({ node, token }) => (token ? token.lexeme : node.lexeme))

    const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
    const tokens = allTokens

    const string = NodeFactory.abstract.STRING_COLLECTION(tokens)

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

      const quantity = NodeFactory.abstract.QUANTITY(unit)
      quantity.setAttributes({ originalNodes: [numericalValue.clone(), unit.clone()], reorganized: true })

      return MOVE_NODE_TO(quantity, numericalValue, 0, `ignore`)
    } else {
      const unit = result

      const quantity = NodeFactory.abstract.QUANTITY(unit)
      quantity.setAttributes({ originalNodes: [unit.clone()], reorganized: true })

      return quantity

      const numericalValue = NodeFactory.abstract.PRIMITIVE(1, `number`)

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
    const value = NodeFactory.abstract.PRIMITIVE(1, `number`)

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
    const newSign = NodeFactory.abstract.SIGN(signToken)
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
    predicate(node => {
      // 1. nil
      if (node.type.name === `nil`) return true

      // 2. List os whitespaces / whitespace
      if (node.type.name === `whitespace`) return true
      if (node.type.name === `list`) {
        const allWhitespaces = node.children.every(child => child.type.name === `whitespace`)
        if (allWhitespaces) return true
      }

      return false
    }),
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

    // 1. Create Function node from string and parenthesis
    const fn: Node = NodeFactory.abstract.FUNCTION(string, parenthesis)

    // 2. Remove parenthesis from tree
    // TODO: Think a better way to handle this. This kills the immutability of the Semantic NRS
    node.children.remove(parenthesis.index, { refreshIndexing: false })

    return ADD_NODE_AT(fn, index, `ignore`)
  },
)

// Collapse parenthesis into a string collection
RULESET_SEMANTIC.add(
  `collapse-parenthesis-into-string`, //
  flow(
    type(`name`, `parenthesis`),
    predicate(node => node.children.length >= 1),
    match(NODE.SCOPE(CONTAINS(`textual`))),
    predicate(node => {
      // 1. check if all children are literals OR an aggregator
      const childrenTypes = node.children.map(child => child.type)

      const areAllChildrenLiterals = childrenTypes.every(type => type.isLiteralLike() || type.id === `whitespace`)
      const isChildIrrelevant = node.children.length === 1 && node.children.nodes[0].getScope(`isolation`)[0] === `irrelevant`

      if (!areAllChildrenLiterals && !isChildIrrelevant) return false

      // 2. check if some child is of textual scopes
      const _childrenScopes = node.children.map(child => child.getScope())
      const childrenScopes = uniq(_childrenScopes.flat())

      assert(childrenScopes.length === 1, `All children should be of the same scope`)
      assert(!childrenScopes.includes(`derived`), `Children should NOT be of derived scope`)

      return childrenScopes.includes(`textual`)
    }),
  ),
  node => {
    if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

    assert(node.children.length !== 0, `How to collapse empty strings?`)

    // TODO: Use collapse centralized function
    const tokenized = node.tokenize() as NodeTokenizedWord_Node[]
    const _tokenized = tokenized.map(({ node, token }) => (token ? token.lexeme : node.lexeme))

    const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
    const tokens = allTokens

    const string = NodeFactory.abstract.STRING_COLLECTION(tokens)

    return string
  },
)
