import { last, uniq } from "lodash"
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
import { NodeTokenizedWord_Node } from "../../../node/node/token"

export const RULESET_SIMPLIFY_TEXT = new RuleSet(`simplify/text`)

// // Collapse parenthesis into a string collection
// RULESET_SIMPLIFY_TEXT.add(
//   `collapse-parenthesis-into-string`, //
//   flow(
//     type(`name`, `parenthesis`),
//     predicate(node => node.children.length >= 1),
//     match(NODE.SCOPE(CONTAINS(`textual`))),
//     predicate(node => {
//       // 1. check if all children are literals OR an aggregator
//       const childrenTypes = node.children.map(child => child.type)

//       const areAllChildrenLiterals = childrenTypes.every(type => type.isLiteralLike() || type.id === `whitespace`)
//       const isChildIrrelevant = node.children.length === 1 && node.children.nodes[0].getScope(`isolation`)[0] === `irrelevant`

//       if (!areAllChildrenLiterals && !isChildIrrelevant) return false

//       // 2. check if some child is of textual scopes
//       const _childrenScopes = node.children.map(child => child.getScope())
//       const childrenScopes = uniq(_childrenScopes.flat())

//       assert(childrenScopes.length === 1, `All children should be of the same scope`)
//       assert(!childrenScopes.includes(`derived`), `Children should NOT be of derived scope`)

//       return childrenScopes.includes(`textual`)
//     }),
//   ),
//   node => {
//     if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

//     assert(node.children.length !== 0, `How to collapse empty strings?`)

//     // TODO: Use collapse centralized function
//     const tokenized = node.tokenize() as NodeTokenizedWord_Node[]
//     const _tokenized = tokenized.map(({ node, token }) => (token ? token.lexeme : node.lexeme))

//     const allTokens = tokenized.flatMap(({ node, token }) => (token ? [token] : node.tokens))
//     const tokens = allTokens

//     const string = NodeFactory.abstract.STRING_COLLECTION(tokens)

//     return string
//   },
// )
