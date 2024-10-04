import { last } from "lodash"
import { simplify } from "mathjs"
import assert from "assert"

import { flow } from "fp-ts/lib/function"

import { EQUALS } from "@december/utils/match/element"
import { AND, OR } from "@december/utils/match/logical"
import { CONTAINS } from "@december/utils/match/set"
import { NOT } from "@december/utils/match/base"

import { ADDITION, MULTIPLICATION, SIGN, SUBTRACTION } from "../../../type/declarations/operator"
import { NUMBER, QUANTITY, STRING, UNIT } from "../../../type/declarations/literal"
import { TYPE, NODE, NodePattern } from "../../../match/pattern"

import Node, { NodeFactory } from "../../../node"

import { RuleSet } from "../../../nrs/ruleset"

import { filter, isLiteralLike, isNotLiteralLike, leftOperand, match, matchInChildren, nextSibling, parent, predicate, previousSibling, rightOperand, type } from "../../../nrs/rule/match/functions"
import { ADD_NODE_AT, COLLAPSE_NODE, COMPLEX_MUTATION, REMOVE_NODE, SWAP_NODES_AT } from "../../../nrs/rule/mutation/instruction"
import Token from "../../../token"
import { RuleMatch } from "../../../nrs/rule/match"

export const RULESET_SIMPLIFY_MATH = new RuleSet(`simplify/math`)

// `(Operator) -> Operator`
// (Collapse single operator parenthesis)
RULESET_SIMPLIFY_MATH.add(
  `(Operator) -> Operator`, //
  flow(
    type(`name`, `parenthesis`), //
    predicate(node => node.children.length === 1),
    leftOperand,
    type(`id`, `operator`),
  ),
  node => node.children.nodes[0],
)

// `(_NonLiteral-_Literal1)+_Literal2 -> _NonLiteral+(_Literal2-_Literal1)`
// `(_NonLiteral+_Literal1)-_Literal2 -> _NonLiteral+(_Literal1-_Literal2)`
// `(_Literal1+_NonLiteral)-_Literal2 -> _NonLiteral+(_Literal1-_Literal2)`
// (Move Non-Literal to leftmost)
RULESET_SIMPLIFY_MATH.add(
  `Isolate NonLiteral in "-" -> "+" situations`, //
  [
    new RuleMatch(
      flow(
        type(`name`, `addition`),
        predicate(node => node.children.length === 2), // two operands
        flow(
          leftOperand,
          type(`name`, `subtraction`), //
          predicate(node => node.children.length === 2), // two operands
          flow(leftOperand, isNotLiteralLike),
        ),
      ),
      {
        optional: true,
      },
    ),
    new RuleMatch(
      flow(
        type(`name`, `subtraction`),
        predicate(node => node.children.length === 2), // two operands
        flow(
          leftOperand,
          type(`name`, `addition`), //
          predicate(node => node.children.length === 2), // two operands
          flow(leftOperand, isNotLiteralLike),
        ),
      ),
      {
        optional: true,
      },
    ),
    new RuleMatch(
      flow(
        type(`name`, `subtraction`),
        predicate(node => node.children.length === 2), // two operands
        flow(
          leftOperand,
          type(`name`, `addition`), //
          predicate(node => node.children.length === 2), // two operands
          flow(rightOperand, isNotLiteralLike),
        ),
      ),
      {
        optional: true,
      },
    ),
  ],
  (node, state) => {
    // `(_NonLiteral-_Literal1)+_Literal2 -> _NonLiteral+(_Literal2-_Literal1)`
    // `(_NonLiteral+_Literal1)-_Literal2 -> _NonLiteral+(_Literal1-_Literal2)`
    // `(_Literal1+_NonLiteral)-_Literal2 -> _NonLiteral+(_Literal1-_Literal2)`

    const isI = state.matches[0].value
    const isII = state.matches[1].value
    const isIII = state.matches[2].value

    const [left, C] = node.children.nodes
    const [A, B] = left.children.nodes

    if (isI) {
      left.swapWith(C) // (A - LB) + LC -> LC + (A - LB)
      C.swapWith(A) // LC + (A - LB) -> A + (LC - LB)
    } else if (isII) {
      // (A + LB) - LC -> (A + LB) + LC
      node.setType(ADDITION)
      node.clearTokens()
      node.addToken(NodeFactory.makeToken(`+`, ADDITION))

      // (A + LB) + LC -> (A - LB) + LC
      left.setType(SUBTRACTION)
      left.clearTokens()
      left.addToken(NodeFactory.makeToken(`-`, SUBTRACTION))

      left.swapWith(C) // (A - LB) + LC -> LC + (A - LB)
      C.swapWith(A) // LC + (A - LB) -> A + (LC - LB)
      C.swapWith(B) // A + (LC - LB) -> A + (LB - LC)
    } else if (isIII) {
      // (LA + B) - LC -> (LA + B) + LC
      node.setType(ADDITION)
      node.clearTokens()
      node.addToken(NodeFactory.makeToken(`+`, ADDITION))

      // (LA + B) + LC -> (LA - B) + LC
      left.setType(SUBTRACTION)
      left.clearTokens()
      left.addToken(NodeFactory.makeToken(`-`, SUBTRACTION))

      left.swapWith(C) // (LA - B) + LC -> LC + (LA - B)
      C.swapWith(B) // LC + (LA - B) -> B + (LC - LA)
      C.swapWith(A) // B + (LC - LA) -> B + (LA - LC)
    }

    return COMPLEX_MUTATION()
  },
)
