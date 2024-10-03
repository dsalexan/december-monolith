import { last } from "lodash"
import { simplify } from "mathjs"
import assert from "assert"

import { flow } from "fp-ts/lib/function"

import { EQUALS } from "@december/utils/match/element"
import { AND, OR } from "@december/utils/match/logical"
import { CONTAINS } from "@december/utils/match/set"
import { NOT } from "@december/utils/match/base"

import { MULTIPLICATION, SIGN } from "../../../type/declarations/operator"
import { NUMBER, QUANTITY, STRING, UNIT } from "../../../type/declarations/literal"
import { TYPE, NODE, NodePattern } from "../../../match/pattern"

import Node from "../../../node"

import { RuleSet } from "../../../nrs/ruleset"

import { filter, isLiteralLike, leftOperand, match, matchInChildren, nextSibling, parent, predicate, previousSibling, rightOperand, type } from "../../../nrs/rule/match/functions"
import { ADD_NODE_AT, COLLAPSE_NODE, REMOVE_NODE, SWAP_NODES_AT } from "../../../nrs/rule/mutation/instruction"
import Token from "../../../token"

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
