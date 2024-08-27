// @ts-nocheck

import { flow } from "fp-ts/lib/function"

import { EQUALS } from "@december/utils/match/value"
import { AND } from "@december/utils/match/logical"
import { MULTIPLICATION } from "../../type/declarations/operator"
import { NUMBER } from "../../type/declarations/literal"
import { TYPE, NODE } from "../../match/pattern"

import { NodeReplacementSystem } from "../../nrs"
import { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT } from "../../nrs/system"
import { Rule, leftOperand, match, matchInChildren, nextSibling, predicate, filter, ADD_NODE_AT, offspringAt, rightOperand } from "../../nrs/rule"
import { RuleMatch } from "../../nrs/rule/match"
import { RuleSet } from "../../nrs/rule/rule"

import { RuleSet } from "../../nrs/rule/rule"
import assert from "assert"
import Token from "../../token"
import Node from "../../node"

// export const BASE_RULESET: Rule[] = []
export const RULESET = new RuleSet()

//             addRule( new TARuleFromString( '0+_1', '_1' ) );
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`addition`))), // "+"
    leftOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`0`)))), // left === "0"
  ),
  node => node.children[1],
)

//             addRule( new TARuleFromString( '_Literal2=0-_1', '_1=0-_Literal2' ) );
//                push literal to rightmost
RULESET.add(
  [
    flow(match(TYPE.NAME(EQUALS(`equals`)))), // "="
    flow(leftOperand, match(TYPE.ID(EQUALS(`literal`)))), // left === _Literal2
    flow(rightOperand, match(TYPE.NAME(EQUALS(`subtraction`)))), // right === "-"
    flow(
      rightOperand, // right >
      leftOperand, // right > left
      match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`0`)))), // right > left === "0"
    ),
  ],
  // _Literal2 = 0 - XXXXXXXXX
  (node: Node, state) => {
    node.tree.swap(node.children[0], node.children[1].children[1])

    return KEEP_NODE
  },
)

//             addRule( new TARuleFromString( '_1+0', '_1' ) );
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`addition`))), // "+"
    rightOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`0`)))), // right === "0"
  ),
  node => node.children[0],
)

//             addRule( new TARuleFromString( '1*_1', '_1' ) );
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`multiplication`))), // "*"
    leftOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`1`)))), // left === "1"
  ),
  node => node.children[1],
)

//             addRule( new TARuleFromString( '_1*1', '_1' ) );
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`multiplication`))), // "*"
    rightOperand,
    match(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`1`)))), // right === "1"
  ),
  node => node.children[0],
)

//             addRule( new TARuleFromString( '_1+_1', '2*_1' ) );
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`addition`))), // "+"
    predicate(node => node.children.length === 2), // two operands
    predicate(node => node.children[0].content === node.children[1].content), // left === right
  ),
  node => {
    // TODO: Improve this mess (it works thou)

    const [left, right] = node.children

    node.setType(MULTIPLICATION) // "+" -> "*"

    assert(node.tokens.length === 1, `Too many tokens`)
    const [plus] = node.tokens

    const originalExpression = plus.expression

    // 1. Update expression (partial only to correct for operator change)
    const before1 = originalExpression.substring(0, plus.interval.start)
    const after1 = originalExpression.substring(plus.interval.start + plus.interval.length)
    const newExpression1 = before1 + `*` + after1
    plus.updateExpression(newExpression1)

    const twoToken = new Token(plus.grammar, { start: left.range.column(`first`), length: 1, type: NUMBER })
    const before2 = originalExpression.substring(0, twoToken.interval.start)
    const after2 = originalExpression.substring(plus.interval.start + plus.interval.length)
    const newExpression2 = before2 + `2` + `*` + after2
    twoToken.updateExpression(newExpression2)

    const two = new Node(twoToken)

    // tree.replaceWith(...)
    node._removeChildAt(0, true) // remove left from node
    node._addChild(two, 0) // add two to node as left

    return node
  },
)

//             addRule( new TARuleFromString( '_1-_1', '0' ) );
RULESET.add(
  flow(
    match(TYPE.NAME(EQUALS(`subtraction`))), // "-"
    predicate(node => node.children.length === 2), // two operands
    predicate(node => node.children[0].content === node.children[1].content), // left === right
  ),
  node => {
    // TODO: Improve this mess (it works thou)
    // TODO: Probably should work on the calculations part (since comparing lexemes is not really what I want for this rule)

    const [left, right] = node.children
    const [minus] = node.tokens

    let modifiedExpression = minus.expression

    const zeroToken = new Token(minus.lexer, { start: left.range.column(`first`), length: 1, type: NUMBER })
    modifiedExpression = modifiedExpression.substring(0, zeroToken.interval.start) + `0` + modifiedExpression.substring(zeroToken.interval.length)
    zeroToken.updateExpression(modifiedExpression)
    const zero = new Node(zeroToken)

    return zero
  },
)

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

//             addRule( new TARuleFromString( '_Literal*_NonLiteral', '_NonLiteral*_Literal' ) );
//             addRule( new TARuleFromString( '_Literal+_NonLiteral', '_NonLiteral+_Literal' ) );

//             addRule( new TARuleFromString( '_Literal1+(_Literal2+_NonLiteral)', '_NonLiteral+(_Literal1+_Literal2)' ) );
//             addRule( new TARuleFromString( '_Literal1+(_Literal2+_1)', '_1+(_Literal1+_Literal2)' ) );

//             addRule( new TARuleFromString( '(_1*_2)+(_3*_2)', '(_1+_3)*_2' ) );
//             addRule( new TARuleFromString( '(_2*_1)+(_2*_3)', '(_1+_3)*_2' ) );

//             addRule( new TARuleFromString( '(_2*_1)+(_3*_2)', '(_1+_3)*_2' ) );
//             addRule( new TARuleFromString( '(_1*_2)+(_2*_3)', '(_1+_3)*_2' ) );

//             addRule( new TARuleFromString( '(_Literal * _1 ) / _Literal', '_1' ) );
//             addRule( new TARuleFromString( '(_Literal1 * _1 ) / _Literal2', '(_Literal1 * _Literal2 ) / _1' ) );

//             addRule( new TARuleFromString( '(_1+_2)+_3', '_1+(_2+_3)' ) );
//             addRule( new TARuleFromString( '(_1*_2)*_3', '_1*(_2*_3)' ) );

//             addRule( new TARuleFromString( '_1+(_1+_2)', '(2*_1)+_2' ) );

//             addRule( new TARuleFromString( '_1+_2*_1', '(1+_2)*_1' ) );

//             addRule( new TARuleFromString( '_literal1 * _NonLiteral = _literal2', '_literal2 / _literal1 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_literal1 + _NonLiteral = _literal2', '_literal2 - _literal1 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_literal1 - _NonLiteral = _literal2', '_literal1 - _literal2 = _NonLiteral' ) );
//             addRule( new TARuleFromString( '_literal1 / _NonLiteral = _literal2', '_literal1 * _literal2 = _NonLiteral' ) );

const NRS = new NodeReplacementSystem()
NRS.addRuleSet(RULESET)

export default NRS
