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

import Node, { NodeFactory } from "../../../node"

import { RuleSet } from "../../../nrs/ruleset"

import { filter, isLiteralLike, isNotLiteralLike, leftOperand, match, matchInChildren, nextSibling, parent, predicate, previousSibling, rightOperand, type } from "../../../nrs/rule/match/functions"
import { ADD_NODE_AT, COLLAPSE_NODE, COMPLEX_MUTATION, REMOVE_NODE, SWAP_NODES_AT } from "../../../nrs/rule/mutation/instruction"
import Token from "../../../token"

function sameType(node: Node, parent: Node) {
  return node.type.getFullName() === parent.type.getFullName()
}

export const RULESET_SIMPLIFY_STACK_OVERFLOW = new RuleSet(`simplify/stackOverflow`)

// #region Really basic shit, mostly involving one constant

// `0+_1 -> _1`
// (Remove zero from right side of addition)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `0+_1 -> _1`, //
  flow(
    type(`name`, `addition`), // "+"
    rightOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.CONTENT(EQUALS(`0`)))), // left === "0"
  ),
  node => node.children.nodes[0],
)

// `_1+0 -> _1`
// (Remove zero from left side of addition)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `_1+0 -> _1`, //
  flow(
    type(`name`, `addition`), // "+"
    leftOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.CONTENT(EQUALS(`0`)))), // left === "0"
  ),
  node => node.children.nodes[1],
)

// `1*_1 -> _1`
// (Ignore multiplication by one from the left side)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `1*_1 -> _1`, //
  flow(
    type(`name`, `multiplication`), // "*"
    leftOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.CONTENT(EQUALS(`1`)))), // left === "1"
  ),
  node => node.children.nodes[1],
)

// `_1*1 -> _1`
// (Ignore multiplication by one from the right side)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `_1*1 -> _1`, //
  flow(
    type(`name`, `multiplication`), // "*"
    rightOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.CONTENT(EQUALS(`1`)))), // left === "1"
  ),
  node => node.children.nodes[1],
)

// // `_1+_1 -> 2*_1`
// // (Combine two equal literals into multiplication)
// RULESET_SIMPLIFY_STACK_OVERFLOW.add(
//   `_1+_1 -> 2*_1`, //
//   flow(
//     type(`name`, `addition`), // "+"
//     predicate(node => node.children.length === 2), // two operands
//     predicate(node => node.children.nodes[0].content === node.children.nodes[1].content), // left === right
//   ),
//   node => {
//     const [left, right] = node.children.nodes

//     // 1. Change type to multiplication
//     node.setType(MULTIPLICATION)
//     node.clearTokens()

//     const times = new Token({ type: `concrete`, value: `*` }, MULTIPLICATION)
//     node.addToken(times)

//     // 2. Add new literal node (2) in place of left node
//     const two = Node.fromToken(`2`, NUMBER)
//     left.syntactical.replaceWith(two, { refreshIndexing: false })

//     return COMPLEX_MUTATION()
//   },
// )

// `_1-_1 -> 0`
// (Subtraction of equal literals)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `_1-_1 -> 0`, //
  flow(
    type(`name`, `subtraction`), // "-"
    predicate(node => node.children.length === 2), // two operands
    predicate(node => node.children.nodes[0].content === node.children.nodes[1].content), // left === right
  ),
  node => NodeFactory.make(`0`, NUMBER),
)

// #endregion

// #region Moving shit around

// `_Literal+_NonLiteral -> _NonLiteral+_Literal`
// (Move Non-Literal shit to left, move literal shit to right)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `_Literal+_NonLiteral -> _NonLiteral+_Literal`, //
  flow(
    match(OR<NodePattern>(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`multiplication`)))), // "+"" or "*"
    predicate(node => node.children.length === 2), // two operands
    flow(leftOperand, isLiteralLike, parent), // left === literal
    flow(rightOperand, isNotLiteralLike, parent), // right !== literal
  ),
  node => SWAP_NODES_AT(node.children.nodes[0], node.children.nodes[1]),
)

// `(_NonLiteral+_Literal1)+_Literal2 -> _NonLiteral+(_Literal1+_Literal2)`
// `(_Literal1+_NonLiteral)+_Literal2 -> _NonLiteral+(_Literal1+_Literal2)`
// (Move Non-Literal to leftmost)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `(_NonLiteral+_Literal1)+_Literal2 | (_Literal1+_NonLiteral)+_Literal2 -> _NonLiteral+(_Literal1+_Literal2)`, //
  flow(
    match(OR<NodePattern>(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`multiplication`)))), // "+"" or "*"
    predicate(node => node.children.length === 2), // two operands
    predicate(node => {
      const [left, right] = node.children.nodes

      // const content = node.getContent({
      //   wrapInParenthesis: node => [`operator`, `enclosure`].includes(node.type.id),
      // })

      // if (content === `((x+10)+10)`) debugger

      if (right.type.isLiteralLike() && sameType(left, node) && left.children.length === 2) {
        const [A, B] = left.children.nodes

        // I) (_NonLiteral+_Literal1)+_Literal2
        if (B.type.isLiteralLike() && A.type.id !== `literal`) return true

        // II) (_Literal1+_NonLiteral)+_Literal2 -> _NonLiteral+(_Literal1+_Literal2)
        if (A.type.isLiteralLike() && B.type.id !== `literal`) return true
      }

      return false
    }),
  ),
  node => {
    const [left, right] = node.children.nodes

    const [A, B] = left.children.nodes
    const C = right

    const isI = B.type.isLiteralLike() && A.type.id !== `literal`

    if (isI) {
      // (A + LB) + LC -> A + (LB + LC)

      left.swapWith(C) // (A + LB) + LC -> LC + (A + LB)
      C.swapWith(A) // LC + (A + LB) -> A + (LC + LB)
      B.swapWith(C) // A + (LC + LB) -> A + (LB + LC)
    } else {
      // (LA + B) + LC -> B + (LA + LC)

      left.swapWith(C) // (LA + B) + LC -> LC + (LA + B)
      C.swapWith(B) // LC + (LA + B) -> B + (LA + LC)
    }

    return COMPLEX_MUTATION()
  },
)

// // `(_1+_2)+_3 -> _1+(_2+_3)`
// // (Move parentheses to the right)
// RULESET_SIMPLIFY_STACK_OVERFLOW.add(
//   `(_1+_2)+_3 -> _1+(_2+_3)`, //
//   flow(
//     match(OR<NodePattern>(TYPE.NAME(EQUALS(`addition`)), TYPE.NAME(EQUALS(`multiplication`)))), // "+"" or "*"
//     predicate(node => node.children.length === 2), // two operands
//     predicate(node => {
//       const [left, right] = node.children.nodes

//       if (left.type.getFullName() === node.type.getFullName()) return left.children.length === 2

//       return false
//     }),
//   ),
//   node => {
//     const [left, C] = node.children.nodes
//     const [A, B] = left.children.nodes

//     left.swapWith(C) // (A + B) + C -> C + (A + B)
//     C.swapWith(A) // C + (A + B) -> A + (C + B)
//     C.swapWith(B) // A + (C + B) -> A + (B + C)

//     return COMPLEX_MUTATION()
//   },
// )

// #endregion

// #region Equation Shit

// `_Literal2=0-_1 -> _1=0-_Literal2`
// (Move literal to the right side of equation)
RULESET_SIMPLIFY_STACK_OVERFLOW.add(
  `_Literal2=0-_1 -> _1=0-_Literal2`, //
  [
    type(`name`, `equals`), // "="
    flow(leftOperand, match(OR<NodePattern>(TYPE.ID(EQUALS(`literal`)), TYPE.MODULE(CONTAINS(`literal:like`))))), // left === _Literal2
    flow(rightOperand, type(`name`, `subtraction`)), // right === "-"
    flow(
      rightOperand, // right >
      leftOperand, // right > left
      match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.CONTENT(EQUALS(`0`)))), // right > left === "0"
    ),
  ],
  // _Literal2 = 0 - XXXXXXXXX
  (node: Node, state) => SWAP_NODES_AT(node.children.nodes[0], node.children.nodes[1].children.nodes[1]),
)

// #endregion

//             addRule( new TARuleFromString( '_1/_1', '1' ) );

//             // Rate = (pow((EndValue / BeginValue), (1 / (EndYear - BeginYear)))-1) * 100

//             addRule( new TARuleFromString( 'exp(_Literal1) * exp(_Literal2 )', 'exp( _Literal1 + _Literal2 )' ) );
//             addRule( new TARuleFromString( 'exp( 0 )', '1' ) );

//             addRule( new TARuleFromString( 'pow(_Literal1,_1) * pow(_Literal2,_1)', 'pow(_Literal1 * _Literal2,_1)' ) );
//             addRule( new TARuleFromString( 'pow( _1, 0 )', '1' ) );
//             addRule( new TARuleFromString( 'pow( _1, 1 )', '_1' ) );
//             addRule( new TARuleFromString( 'pow( _1, -1 )', '1/_1' ) );
//             addRule( new TARuleFromString( 'pow( pow( _1, _Literal1 ), _Literal2 )', 'pow( _1, _Literal1 * _Literal2 )' ) );

// //          addRule( new TARuleFromString( 'pow( _Literal1, _1 )', 'ln(_1) / ln(_Literal1)' ) );
//             addRule( new TARuleFromString( '_literal1 = pow( _Literal2, _1 )', '_1 = ln(_literal1) / ln(_Literal2)' ) );
//             addRule( new TARuleFromString( 'pow( _Literal2, _1 ) = _literal1 ', '_1 = ln(_literal1) / ln(_Literal2)' ) );

//             addRule( new TARuleFromString( 'pow( _1, _Literal2 ) = _literal1 ', 'pow( _literal1, 1 / _Literal2 ) = _1' ) );

//             addRule( new TARuleFromString( 'pow( 1, _1 )', '1' ) );

//             addRule( new TARuleFromString( '_1 * _1 = _literal', '_1 = sqrt( _literal )' ) );

//             addRule( new TARuleFromString( 'sqrt( _literal * _1 )', 'sqrt( _literal ) * sqrt( _1 )' ) );

//             addRule( new TARuleFromString( 'ln( _Literal1 * _2 )', 'ln( _Literal1 ) + ln( _2 )' ) );
//             addRule( new TARuleFromString( 'ln( _1 * _Literal2 )', 'ln( _Literal2 ) + ln( _1 )' ) );
//             addRule( new TARuleFromString( 'log2( _Literal1 * _2 )', 'log2( _Literal1 ) + log2( _2 )' ) );
//             addRule( new TARuleFromString( 'log2( _1 * _Literal2 )', 'log2( _Literal2 ) + log2( _1 )' ) );
//             addRule( new TARuleFromString( 'log10( _Literal1 * _2 )', 'log10( _Literal1 ) + log10( _2 )' ) );
//             addRule( new TARuleFromString( 'log10( _1 * _Literal2 )', 'log10( _Literal2 ) + log10( _1 )' ) );

//             addRule( new TARuleFromString( 'ln( _Literal1 / _2 )', 'ln( _Literal1 ) - ln( _2 )' ) );
//             addRule( new TARuleFromString( 'ln( _1 / _Literal2 )', 'ln( _Literal2 ) - ln( _1 )' ) );
//             addRule( new TARuleFromString( 'log2( _Literal1 / _2 )', 'log2( _Literal1 ) - log2( _2 )' ) );
//             addRule( new TARuleFromString( 'log2( _1 / _Literal2 )', 'log2( _Literal2 ) - log2( _1 )' ) );
//             addRule( new TARuleFromString( 'log10( _Literal1 / _2 )', 'log10( _Literal1 ) - log10( _2 )' ) );
//             addRule( new TARuleFromString( 'log10( _1 / _Literal2 )', 'log10( _Literal2 ) - log10( _1 )' ) );

//             addRule( new TARuleFromString( '_Literal1 = _NonLiteral + _Literal2', '_Literal1 - _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_Literal1 = _NonLiteral * _Literal2', '_Literal1 / _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_Literal1 = _NonLiteral / _Literal2', '_Literal1 * _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_Literal1 =_NonLiteral - _Literal2',  '_Literal1 + _Literal2 = _NonLiteral' ) );

//             addRule( new TARuleFromString( '_NonLiteral + _Literal2 = _Literal1 ', '_Literal1 - _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_NonLiteral * _Literal2 = _Literal1 ', '_Literal1 / _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_NonLiteral / _Literal2 = _Literal1 ', '_Literal1 * _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_NonLiteral - _Literal2 = _Literal1',  '_Literal1 + _Literal2 = _NonLiteral' ) );

//             addRule( new TARuleFromString( '_NonLiteral - _Literal2 = _Literal1 ', '_Literal1 + _Literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_Literal2 - _NonLiteral = _Literal1 ', '_Literal2 - _Literal1 = _NonLiteral' ) );

//             addRule( new TARuleFromString( '_Literal1 = sin( _NonLiteral )', 'asin( _Literal1 ) = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_Literal1 = cos( _NonLiteral )', 'acos( _Literal1 ) = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_Literal1 = tan( _NonLiteral )', 'atan( _Literal1 ) = _NonLiteral' ) );

//             addRule( new TARuleFromString( '_Literal1 = ln( _1 )', 'exp( _Literal1 ) = _1' ) );
//             addRule( new TARuleFromString( 'ln( _1 ) = _Literal1', 'exp( _Literal1 ) = _1' ) );

//             addRule( new TARuleFromString( '_Literal1 = _NonLiteral', '_NonLiteral = _Literal1' ) );

//             addRule( new TARuleFromString( '( _Literal1 / _2 ) = _Literal2', '_Literal1 / _Literal2 = _2 ' ) );

//             addRule( new TARuleFromString( '(_1*_2)+(_3*_2)', '(_1+_3)*_2' ) );
//             addRule( new TARuleFromString( '(_2*_1)+(_2*_3)', '(_1+_3)*_2' ) );

//             addRule( new TARuleFromString( '(_2*_1)+(_3*_2)', '(_1+_3)*_2' ) );
//             addRule( new TARuleFromString( '(_1*_2)+(_2*_3)', '(_1+_3)*_2' ) );

//             addRule( new TARuleFromString( '(_Literal * _1 ) / _Literal', '_1' ) );
//             addRule( new TARuleFromString( '(_Literal1 * _1 ) / _Literal2', '(_Literal1 * _Literal2 ) / _1' ) );

//             addRule( new TARuleFromString( '_1+(_1+_2)', '(2*_1)+_2' ) );

//             addRule( new TARuleFromString( '_1+_2*_1', '(1+_2)*_1' ) );

//             addRule( new TARuleFromString( '_literal1 * _NonLiteral = _literal2', '_literal2 / _literal1 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_literal1 + _NonLiteral = _literal2', '_literal2 - _literal1 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_literal1 - _NonLiteral = _literal2', '_literal1 - _literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_literal1 / _NonLiteral = _literal2', '_literal1 * _literal2 = _NonLiteral' ) );
