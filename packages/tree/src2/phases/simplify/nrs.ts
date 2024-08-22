import { flow } from "fp-ts/lib/function"

import { EQUALS } from "@december/utils/match/value"
import { AND } from "@december/utils/match/logical"
import { TYPE, NODE } from "../../match/pattern"

import { NodeReplacementSystem } from "../../nrs"
import { MatchState, StateRuleMatch, Rule, match, get, offspring, position, offspringAt, getChild, firstChild, leftOperand, rightOperand } from "../../nrs/rule"
import { KEEP_NODE } from "../../nrs/system"
import Node from "../../node"
import { MULTIPLICATION } from "../../type/declarations/operator"
import assert from "assert"
import Token from "../../token"
import { NUMBER } from "../../type/declarations/literal"

export const BASE_RULESET: Rule[] = []

//             addRule( new TARuleFromString( '0+_1', '_1' ) );
BASE_RULESET.push(
  new Rule(
    [
      (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`addition`)))), // "+"
      (state: MatchState) => flow(getChild(state)(0)(0), match(state)(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`0`))))), // "0"
    ],
    node => node.children[1],
  ),
)

//             addRule( new TARuleFromString( '_Literal2=0-_1', '_1=0-_Literal2' ) );
//                push literal to rightmost
BASE_RULESET.push(
  new Rule(
    [
      state => flow(match(state)(TYPE.NAME(EQUALS(`equals`)))), // "="
      state => flow(leftOperand, match(state)(TYPE.ID(EQUALS(`literal`)))), // _Literal2
      state => flow(rightOperand, match(state)(TYPE.NAME(EQUALS(`subtraction`)))), // "-"
      state => flow(rightOperand, leftOperand, match(state)(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`0`))))), // "0"
      // _Literal2 = 0 - XXXXXXXXX
    ],
    // node => node.children[1].children[1],
    (node: Node) => {
      node.tree.swap(node.children[0], node.children[1].children[1])

      return KEEP_NODE
    },
  ),
)

//             addRule( new TARuleFromString( '_1+0', '_1' ) );
BASE_RULESET.push(
  new Rule(
    [
      (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`addition`)))), // "+"
      (state: MatchState) => flow(offspringAt(1, 1), match(state)(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`0`))))), // "0"
    ],
    node => node.children[0],
  ),
)

//             addRule( new TARuleFromString( '1*_1', '_1' ) );
BASE_RULESET.push(
  new Rule(
    [
      (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`multiplication`)))), // "*"
      (state: MatchState) => flow(offspringAt(1, 0), match(state)(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`1`))))), // "1"
    ],
    node => node.children[1],
  ),
)

//             addRule( new TARuleFromString( '_1*1', '_1' ) );
BASE_RULESET.push(
  new Rule(
    [
      (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`multiplication`)))), // "*"
      (state: MatchState) => flow(offspringAt(1, 1), match(state)(AND(TYPE.FULL(EQUALS(`literal:number`)), NODE.LEXEME(EQUALS(`1`))))), // "1"
    ],
    node => node.children[0],
  ),
)

//             addRule( new TARuleFromString( '_1+_1', '2*_1' ) );
BASE_RULESET.push(
  new Rule(
    [
      (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`addition`)))), // "+"
    ],
    node => {
      if (node.children.length !== 2) return KEEP_NODE

      // TODO: Improve this mess (it works thou)

      const [left, right] = node.children
      if (left.lexeme === right.lexeme) {
        node.setType(MULTIPLICATION)

        assert(node.tokens.length === 1, `Too many tokens`)
        const [plus] = node.tokens

        // @ts-ignore
        let modifiedExpression = plus.expression
        modifiedExpression = modifiedExpression.substring(0, plus.interval.start) + `*` + modifiedExpression.substring(plus.interval.length)
        plus.updateExpression(modifiedExpression)

        // @ts-ignore
        const twoToken = new Token(plus.lexer, { start: left.range.column(`first`), length: 1, type: NUMBER })
        modifiedExpression = modifiedExpression.substring(0, twoToken.interval.start) + `2` + modifiedExpression.substring(twoToken.interval.length)
        twoToken.updateExpression(modifiedExpression)
        const two = new Node(twoToken)

        // tree.replaceWith(...)
        node._removeChildAt(0, true) // remove left from node
        node._addChild(two, 0) // add two to node as left

        return node
      }

      return KEEP_NODE
    },
  ),
)

//             addRule( new TARuleFromString( '_1-_1', '0' ) );
BASE_RULESET.push(
  new Rule(
    [
      (state: MatchState) => flow(match(state)(TYPE.NAME(EQUALS(`subtraction`)))), // "-"
    ],
    node => {
      if (node.children.length !== 2) return KEEP_NODE

      // TODO: Improve this mess (it works thou)
      // TODO: Probably should work on the calculations part (since comparing lexemes is not really what I want for this rule)

      const [left, right] = node.children
      if (left.lexeme === right.lexeme) {
        const [minus] = node.tokens

        // @ts-ignore
        let modifiedExpression = minus.expression

        // @ts-ignore
        const zeroToken = new Token(minus.lexer, { start: left.range.column(`first`), length: 1, type: NUMBER })
        modifiedExpression = modifiedExpression.substring(0, zeroToken.interval.start) + `0` + modifiedExpression.substring(zeroToken.interval.length)
        zeroToken.updateExpression(modifiedExpression)
        const zero = new Node(zeroToken)

        return zero
      }

      return KEEP_NODE
    },
  ),
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
NRS.addRuleSet(BASE_RULESET.slice(-1))

export default NRS
