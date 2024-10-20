import { last } from "lodash"
import { simplify } from "mathjs"
import assert from "assert"

import { flow } from "fp-ts/lib/function"

import { EQUALS } from "@december/utils/match/element"
import { AND, OR } from "@december/utils/match/logical"
import { CONTAINS } from "@december/utils/match/set"
import { NOT } from "@december/utils/match/base"
import { isUnit, IUnit } from "@december/utils/unit"

import { MULTIPLICATION, SIGN } from "../../../type/declarations/operator"
import { NUMBER, QUANTITY, STRING, UNIT } from "../../../type/declarations/literal"
import { TYPE, NODE, NodePattern } from "../../../match/pattern"

import Node, { NodeFactory } from "../../../node"

import { RuleSet } from "../../../nrs"

import { filter, isLiteralLike, leftOperand, match, matchInChildren, nextSibling, parent, predicate, previousSibling, rightOperand, type } from "../../../nrs/rule/match/functions"
import { ADD_NODE_AT, COLLAPSE_NODE, COMPLEX_MUTATION, NO_MUTATION, REMOVE_NODE, SWAP_NODES_AT } from "../../../nrs/rule/mutation/instruction"
import Token from "../../../token"
import { RuleMatch } from "../../../nrs/rule/match"

export const RULESET_SIMPLIFY_QUANTITY = new RuleSet(`simplify/quantity`)

// `(_1)q -> _1q`
// (Remove clarity wrapping from quantity when not necessary)
RULESET_SIMPLIFY_QUANTITY.add(
  `(_1)q -> _1q`, //
  flow(
    type(`name`, `quantity`), // "+" or "-"
    predicate(node => {
      if (!node.attributes.clarityWrapper) return false

      const value = node.children.nodes[0]

      if (value.type.name === `string_collection`) return true

      const { arity } = value.type.syntactical!

      return arity <= 1
    }),
  ),
  node => {
    const value = node.children.nodes[0]

    // 1. Remove current tokens
    node.clearTokens()

    // 2. Create unit token
    const unitOfMeasurement = node.attributes.unit as IUnit
    assert(isUnit(unitOfMeasurement), `Quantity is missing unit attribute`)

    const _unit = unitOfMeasurement.getSymbol()
    const unitToken = new Token({ type: `concrete`, value: _unit }, UNIT)
    unitToken.setAttributes({ traversalIndex: -1 })

    node.addToken(unitToken)

    // 3. Reset clarity flag
    node.setAttributes({ clarityWrapper: false })

    return COMPLEX_MUTATION()
  },
)

// `_Literal*Quantity -> Quantity*_Literal`
// (Move quantity to the left side of the operation, and literal to the right)
RULESET_SIMPLIFY_QUANTITY.add(
  `_Literal*Quantity -> Quantity*_Literal`, //
  flow(
    match(OR<NodePattern>(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`multiplication`)))), // "+"" or "*"
    predicate(node => node.children.length === 2), // two operands
    flow(leftOperand, match(AND<any>(OR<NodePattern>(TYPE.ID(EQUALS(`literal`)), TYPE.MODULE(CONTAINS(`literal:like`))), TYPE.NAME(NOT(EQUALS(`quantity`))))), parent), // left === literal (non-quantity)
    flow(rightOperand, match(TYPE.NAME(EQUALS(`quantity`))), parent), // right === quantity
  ),
  node => SWAP_NODES_AT(node.children.nodes[0], node.children.nodes[1]),
)

// `_1q+_2q -> (_1+_2)q || _1q*_2 -> (_1*_2)q`
// (Combine quantities' values with the same unit)
// (Multiply quantity's value by a literal)
RULESET_SIMPLIFY_QUANTITY.add(
  `_1q+_2q -> (_1+_2)q || _1q*_2 -> (_1*_2)q`, //
  [
    // _1q+_2q -> (_1+_2)q
    new RuleMatch(
      flow(
        match(OR<NodePattern>(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`multiplication`)))), // "+"" or "*"
        flow(leftOperand, type(`name`, `quantity`), parent), // left === quantity
        flow(rightOperand, type(`name`, `quantity`), parent), // right === quantity
        predicate(node => {
          const [left, right] = node.children.nodes

          return left.attributes.unit!.isEquals(right.attributes.unit!)
        }),
      ),
      { optional: true },
    ),
    // _1q*_2 -> (_1*_2)q
    new RuleMatch(
      flow(
        match(OR<NodePattern>(TYPE.NAME(EQUALS(`multiplication`)), TYPE.NAME(EQUALS(`division`)))), // "*" or "/"
        flow(leftOperand, type(`name`, `quantity`), parent), // left === quantity
        flow(rightOperand, isLiteralLike, parent), // right === literal
      ),
      { optional: true },
    ),
  ],
  (node, matchState) => {
    /**
     * I)  _1q+_2q -> (_1+_2)q
     * II) _1q*_2 -> (_1*_2)q
     */

    const [{ out, match }] = matchState.matches

    const isI = matchState.matches[0].value
    const isII = matchState.matches[1].value

    const [A, B] = node.children.nodes

    const index = node.index
    const parent = node.parent!

    // 1. Create quantity node
    const unitOfMeasurement = A.attributes.unit!
    const quantity = NodeFactory.abstract.QUANTITY(unitOfMeasurement, { unitString: last(A.tokens)!.lexeme, wrap: true })

    // 2. Create new operator node
    const operator = NodeFactory.abstract.make(node.tokens[0], { type: node.type })
    operator.setAttributes({ originalNodes: [node.clone()] })

    // 3. Add operands to new operator node
    operator.children.add(A.children.get(0), null, { refreshIndexing: false })
    operator.children.add(isI ? B.children.get(0) : B, null, { refreshIndexing: false })

    // 4. Add new operator to master quantity
    quantity.children.add(operator, null, { refreshIndexing: false })

    return quantity
  },
)
