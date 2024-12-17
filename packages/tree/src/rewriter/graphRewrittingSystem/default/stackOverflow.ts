/**
 * https://stackoverflow.com/questions/7540227/strategies-for-simplifying-math-expressions/7542438#7542438
 */

import assert from "assert"

import { BinaryExpression, Node, NumericLiteral } from "../../../tree"
import { ArtificialToken, getTokenKind } from "../../../token"

import { isBinaryExpression, isLiteral, isNumericLiteral } from "../../../utils/guards"
import { artificialize, artificializeTree, makeConstantLiteral } from "../../../utils/factories"

import { createGraphRewritingRule, GraphRewritingRule, PatternTargetMapMatch, PatternTargetMatch } from ".."
import { getRepeatingNodes } from "../../../utils/other"

export const STACK_OVERFLOW_RULESET: GraphRewritingRule[] = []

// #region Constants & Repeating terms

// 0 + _1 -> _1
// _1 + 0 -> _1
// (Remove term zero from ADDITION)
//        addRule( new TARuleFromString( '0+_1', '_1' ) );
//        addRule( new TARuleFromString( '_1+0', '_1' ) );
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `REMOVE_ZERO_FROM_ADDITION`,
    node => {
      // if (!(node instanceof BinaryExpression) || node.operator.content !== `+`) return false
      if (!isBinaryExpression(node, `+`)) return false

      if (isNumericLiteral(node.left, 0)) return { target: `right` }
      if (isNumericLiteral(node.right, 0)) return { target: `left` }

      return false
    },
    (node: BinaryExpression, { match }: { match: PatternTargetMatch }) => node[match.target],
  ),
)

// 1 * _1 -> _1
// _1 * 1 -> _1
// (Remove term 1 from MULTIPLICATION or DIVIDEND)
//      addRule( new TARuleFromString( '1*_1', '_1' ) );
//      addRule( new TARuleFromString( '_1*1', '_1' ) );
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `REMOVE_ONE_FROM_MULTIPLICATION_OR_DIVIDEND`,
    node => {
      // if (!(node instanceof BinaryExpression)) return false
      if (!isBinaryExpression(node)) return false

      const operator = node.operator.content
      // remove 1 from multiplicand
      if (operator === `*`) {
        if (isNumericLiteral(node.left, 1)) return { target: `right` }
        else if (isNumericLiteral(node.right, 1)) return { target: `left` }
      }
      // remove 1 from dividend
      else if (operator === `/` && isNumericLiteral(node.right, 1)) return { target: `left` }

      return false
    },
    (node: BinaryExpression, { match }: { match: PatternTargetMatch }) => node[match.target],
  ),
)

// _1 - _1 -> 0                         {A}
// _1 / _1 -> 1                         {B}
// _1 + _1 -> 2 * _1                    {C}
//
// (_Literal * _1) / _Literal -> _1     {D}
// (_1 * _Literal) / _Literal -> _1     {E}
//
// _1 + (_1 + _2) -> (_1 * 2) * _2      {F}
// _1 + (_2 + _1) -> (_1 + 2) * _2      {G}
// (_1 + _2) + _1 -> (_1 + 2) * _2      {H}
// (_2 + _1) + _1 -> (_1 + 2) * _2      {I}
//
// _1 + (_2 * _1) -> (_2 + 1) * _1      {J}
// _1 + (_1 * _2) -> (_2 + 1) * _1      {K}
// (_2 * _1) + _1 -> (_2 + 1) * _1      {L}
// (_1 * _2) + _1 -> (_2 + 1) * _1      {M}
// (Remove repeating identical terms from SUBTRACTION, DIVISION, and ADDITION)
//      addRule( new TARuleFromString( '_1+_1', '2*_1' ) );
//      addRule( new TARuleFromString( '_1-_1', '0' ) );
//      addRule( new TARuleFromString( '_1/_1', '1' ) );
//      addRule( new TARuleFromString( '(_Literal * _1 ) / _Literal', '_1' ) );
//      addRule( new TARuleFromString( '_1+_2*_1', '(1+_2)*_1' ) );
//      addRule( new TARuleFromString( '_1+(_1+_2)', '(2*_1)+_2' ) );
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `REMOVE_IDENTICAL_TERMS`,
    node => {
      if (!isBinaryExpression(node, [`/`, `-`, `+`])) return false

      const operator = node.operator.content
      if (operator === `/`) {
        if (isBinaryExpression(node.left, [`*`]) && isLiteral(node.right)) {
          if (isLiteral(node.left.left) && node.left.left.isSimilar(node.right)) return { target: `D` }
          if (isLiteral(node.left.right) && node.left.right.isSimilar(node.right)) return { target: `E` }
        }
      } else if (operator === `+`) {
        if (isBinaryExpression(node.right, [`+`])) {
          if (node.left.isSimilar(node.right.left)) return { target: `F` }
          if (node.left.isSimilar(node.right.right)) return { target: `G` }
        } else if (isBinaryExpression(node.left, [`+`])) {
          if (node.right.isSimilar(node.left.left)) return { target: `H` }
          if (node.right.isSimilar(node.left.right)) return { target: `I` }
        } else if (isBinaryExpression(node.right, [`*`])) {
          if (node.left.isSimilar(node.right.right)) return { target: `J` }
          if (node.left.isSimilar(node.right.left)) return { target: `K` }
        } else if (isBinaryExpression(node.left, [`*`])) {
          if (node.right.isSimilar(node.left.right)) return { target: `L` }
          if (node.right.isSimilar(node.left.left)) return { target: `M` }
        }
      }

      return node.left.isSimilar(node.right) ? { target: `ABC` } : false
    },
    (node: BinaryExpression, { match }: { match: PatternTargetMatch }) => {
      const operator = node.operator.content

      if (match.target === `D`) return (node.left as BinaryExpression).right
      if (match.target === `E`) return (node.left as BinaryExpression).left
      if ([`F`, `G`, `H`, `I`].includes(match.target as string)) {
        artificializeTree(node)

        const TWO = makeConstantLiteral(2)
        const INNER_PLUS = new ArtificialToken(getTokenKind(`plus`), `*`)
        const PLUS = new ArtificialToken(getTokenKind(`plus`), `+`)

        let _2: Node, _1: Node
        if (match.target === `F`) {
          _1 = node.left
          _2 = (node.right as BinaryExpression).right
        } else if (match.target === `G`) {
          _1 = node.left
          _2 = (node.right as BinaryExpression).left
        } else if (match.target === `H`) {
          _1 = node.right
          _2 = (node.left as BinaryExpression).right
        }
        // match.target === `I`
        else {
          _1 = node.right
          _2 = (node.left as BinaryExpression).left
        }

        const innerAddition = new BinaryExpression(_1, INNER_PLUS, TWO)
        return new BinaryExpression(innerAddition, PLUS, _2)
      }
      if (match.target === `J` || match.target === `K` || match.target === `L` || match.target === `M`) {
        artificializeTree(node)

        const ONE = makeConstantLiteral(1)
        const ASTERISK = new ArtificialToken(getTokenKind(`asterisk`), `*`)
        const PLUS = new ArtificialToken(getTokenKind(`plus`), `+`)

        let _2: Node, _1: Node
        if (match.target === `J`) {
          _2 = (node.right as BinaryExpression).left
          _1 = node.left
        } else if (match.target === `K`) {
          _2 = (node.right as BinaryExpression).right
          _1 = node.left
        } else if (match.target === `L`) {
          _2 = (node.left as BinaryExpression).left
          _1 = node.right
        }
        // match.target === `M`
        else {
          _2 = (node.left as BinaryExpression).right
          _1 = node.right
        }

        const addition = new BinaryExpression(_2, PLUS, ONE)
        return new BinaryExpression(addition, ASTERISK, _1)
      }
      if (operator === `-` || operator === `/`) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), operator === `-` ? `0` : `1`))

      artificializeTree(node)

      const TWO = makeConstantLiteral(2)
      const ASTERISK = new ArtificialToken(getTokenKind(`asterisk`), `*`)
      return new BinaryExpression(TWO, ASTERISK, node.right)
    },
  ),
)

// (_1 * _2) + (_3 * _2) -> (_1 + _3) * _2
//
// (* _1, _2) + (* _2, _3) -> (_1 + _3) * _2    {A}
// (Remove repeating operand by distributive property)
//      addRule( new TARuleFromString( '(_1*_2)+(_3*_2)', '(_1+_3)*_2' ) );
//      addRule( new TARuleFromString( '(_2*_1)+(_2*_3)', '(_1+_3)*_2' ) );
//      addRule( new TARuleFromString( '(_2*_1)+(_3*_2)', '(_1+_3)*_2' ) );
//      addRule( new TARuleFromString( '(_1*_2)+(_2*_3)', '(_1+_3)*_2' ) );
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `PROPRIEDADE_DISTRIBUTIVA`,
    node => {
      if (!isBinaryExpression(node, `+`)) return false
      if (!isBinaryExpression(node.left, `*`)) return false
      if (!isBinaryExpression(node.right, `*`)) return false

      artificializeTree(node)

      const [A, B, C, D] = [node.left.left, node.left.right, node.right.left, node.right.right]
      const { nonRepeating, repeating } = getRepeatingNodes(A, B, C, D)

      assert(repeating.length === 1, `Expected one repeating node, got ${repeating.length}`)
      assert(nonRepeating.length === 2, `Expected two non-repeating nodes, got ${nonRepeating.length}`)

      if (nonRepeating.length !== 2 || repeating.length !== 1) return false

      const [_1, _3] = nonRepeating
      const [_2] = repeating

      return { target: { _1, _2, _3 } }
    },
    (node, { match }: { match: PatternTargetMapMatch }) => {
      const { _1, _2, _3 }: Record<string, Node> = match.target

      assert(_1 && _2 && _3, `Expected _1, _2, _3 to be defined`)

      const addition = new BinaryExpression(_1, new ArtificialToken(getTokenKind(`plus`), `+`), _3)
      return new BinaryExpression(addition, new ArtificialToken(getTokenKind(`asterisk`), `*`), _2)
    },
  ),
)

// #endregion

// #region Normal form (mostly move literals to the right)

// _Literal1 + (_NonLiteral + _Literal2) -> _NonLiteral + (_Literal1 + _Literal2) {different from java rule because of the order of literals being changed by SWAP_LITERAL_AND_NON_LITERAL}
// (Group literals at right enclosure)
//      addRule( new TARuleFromString( '_Literal1+(_Literal2+_NonLiteral)', '_NonLiteral+(_Literal1+_Literal2)' ) );
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `GROUP_LITERALS_AT_RIGHT`,
    node => {
      if (!isBinaryExpression(node, [`+`])) return false
      if (!isBinaryExpression(node.right, [`+`])) return false
      return isLiteral(node.left) && !isLiteral(node.right.left) && isLiteral(node.right.right)
    },
    (node: BinaryExpression) => {
      const right = node.right as BinaryExpression
      artificializeTree(node)
      Node.swap(node.left, right.left)
      return node
    },
  ),
)

// _Literal * _NonLiteral -> _NonLiteral * _Literal
// _Literal + _NonLiteral -> _NonLiteral + _Literal
// (Swap literal and non-literal to push literals to right)
//      addRule( new TARuleFromString( '_Literal*_NonLiteral', '_NonLiteral*_Literal' ) );
//      addRule( new TARuleFromString( '_Literal+_NonLiteral', '_NonLiteral+_Literal' ) );
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `SWAP_LITERAL_AND_NON_LITERAL_RIGHTMOST`,
    node => {
      if (!isBinaryExpression(node, [`+`, `*`])) return false
      return isLiteral(node.left) && !isLiteral(node.right)
    },
    (node: BinaryExpression) => artificializeTree(node) && node.swapChildren(0, 1),
  ),
)

// _NonLiteral0 + Literal2 -> SHOULD NOT CHANGE, rule {SWAP_LITERAL_AND_NON_LITERAL}
//
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -> _NonLiteral1 + _NonLiteral2; allowed
// (_NonLiteral - _Literal1) + _Literal2 -> _NonLiteral + (_Literal2 - _Literal1)     {A}
// (_NonLiteral - _Literal1) - _Literal2 -> _NonLiteral - (_Literal1 + _Literal2)     {B}
// (_NonLiteral + _Literal1) - _Literal2 -> _NonLiteral + (_Literal1 - _Literal2)     {C}
// (_NonLiteral + _Literal1) + _Literal2 -> _NonLiteral + (_Literal1 + _Literal2)     {D}
STACK_OVERFLOW_RULESET.push(
  createGraphRewritingRule(
    `UNWRAP_OPERANDS_TO_SWAP_LITERALS_TO_RIGHTMOST`,
    node => {
      if (!isBinaryExpression(node, [`+`, `-`])) return false
      //
      if (!isLiteral(node.right)) return false
      if (!isBinaryExpression(node.left, [`-`, `+`])) return false
      //
      if (isLiteral(node.left.left)) return false
      if (!isLiteral(node.left.right)) return false

      const operator = node.operator.content
      const leftOperator = (node.left as BinaryExpression).operator.content

      if (operator === `+`) {
        if (leftOperator === `-`) return { target: `A` }
        if (leftOperator === `+`) return { target: `D` }
      } else if (operator === `-`) {
        if (leftOperator === `-`) return { target: `B` }
        if (leftOperator === `+`) return { target: `C` }
      }

      return false
    },
    (node: BinaryExpression, { match }: { match: PatternTargetMatch }) => {
      artificializeTree(node)

      const left = node.left as BinaryExpression

      const _NL = left.left
      const _L1 = left.right
      const _L2 = node.right

      let INNER = new ArtificialToken(getTokenKind(`dash`), `-`)
      let OUTER = new ArtificialToken(getTokenKind(`plus`), `+`)

      let _LA = _L1
      let _LB = _L2

      if (match.target === `A`) {
        _LA = _L2
        _LB = _L1
      } else if (match.target === `B`) {
        OUTER = new ArtificialToken(getTokenKind(`dash`), `-`)
        INNER = new ArtificialToken(getTokenKind(`plus`), `+`)
      } else if (match.target === `C`) {
        // pass
      } else if (match.target === `D`) {
        INNER = new ArtificialToken(getTokenKind(`plus`), `+`)
      }

      // slightly modified
      //    -> _NonLiteral <OUTER> (_LiteralA <INNER> _LiteralB)
      const innerOperation = new BinaryExpression(_LA, INNER, _LB)
      return new BinaryExpression(_NL, OUTER, innerOperation)
    },
  ),
)

// #endregion

// addRule( new TARuleFromString( '_Literal2=0-_1', '_1=0-_Literal2' ) );

// // Rate = (pow((EndValue / BeginValue), (1 / (EndYear - BeginYear)))-1) * 100

// addRule( new TARuleFromString( 'exp(_Literal1) * exp(_Literal2 )', 'exp( _Literal1 + _Literal2 )' ) );
// addRule( new TARuleFromString( 'exp( 0 )', '1' ) );

// addRule( new TARuleFromString( 'pow(_Literal1,_1) * pow(_Literal2,_1)', 'pow(_Literal1 * _Literal2,_1)' ) );
// addRule( new TARuleFromString( 'pow( _1, 0 )', '1' ) );
// addRule( new TARuleFromString( 'pow( _1, 1 )', '_1' ) );
// addRule( new TARuleFromString( 'pow( _1, -1 )', '1/_1' ) );
// addRule( new TARuleFromString( 'pow( pow( _1, _Literal1 ), _Literal2 )', 'pow( _1, _Literal1 * _Literal2 )' ) );

// //          addRule( new TARuleFromString( 'pow( _Literal1, _1 )', 'ln(_1) / ln(_Literal1)' ) );
// addRule( new TARuleFromString( '_literal1 = pow( _Literal2, _1 )', '_1 = ln(_literal1) / ln(_Literal2)' ) );
// addRule( new TARuleFromString( 'pow( _Literal2, _1 ) = _literal1 ', '_1 = ln(_literal1) / ln(_Literal2)' ) );

// addRule( new TARuleFromString( 'pow( _1, _Literal2 ) = _literal1 ', 'pow( _literal1, 1 / _Literal2 ) = _1' ) );

// addRule( new TARuleFromString( 'pow( 1, _1 )', '1' ) );

// addRule( new TARuleFromString( '_1 * _1 = _literal', '_1 = sqrt( _literal )' ) );

// addRule( new TARuleFromString( 'sqrt( _literal * _1 )', 'sqrt( _literal ) * sqrt( _1 )' ) );

// addRule( new TARuleFromString( 'ln( _Literal1 * _2 )', 'ln( _Literal1 ) + ln( _2 )' ) );
// addRule( new TARuleFromString( 'ln( _1 * _Literal2 )', 'ln( _Literal2 ) + ln( _1 )' ) );
// addRule( new TARuleFromString( 'log2( _Literal1 * _2 )', 'log2( _Literal1 ) + log2( _2 )' ) );
// addRule( new TARuleFromString( 'log2( _1 * _Literal2 )', 'log2( _Literal2 ) + log2( _1 )' ) );
// addRule( new TARuleFromString( 'log10( _Literal1 * _2 )', 'log10( _Literal1 ) + log10( _2 )' ) );
// addRule( new TARuleFromString( 'log10( _1 * _Literal2 )', 'log10( _Literal2 ) + log10( _1 )' ) );

// addRule( new TARuleFromString( 'ln( _Literal1 / _2 )', 'ln( _Literal1 ) - ln( _2 )' ) );
// addRule( new TARuleFromString( 'ln( _1 / _Literal2 )', 'ln( _Literal2 ) - ln( _1 )' ) );
// addRule( new TARuleFromString( 'log2( _Literal1 / _2 )', 'log2( _Literal1 ) - log2( _2 )' ) );
// addRule( new TARuleFromString( 'log2( _1 / _Literal2 )', 'log2( _Literal2 ) - log2( _1 )' ) );
// addRule( new TARuleFromString( 'log10( _Literal1 / _2 )', 'log10( _Literal1 ) - log10( _2 )' ) );
// addRule( new TARuleFromString( 'log10( _1 / _Literal2 )', 'log10( _Literal2 ) - log10( _1 )' ) );

// addRule( new TARuleFromString( '_Literal1 = _NonLiteral + _Literal2', '_Literal1 - _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_Literal1 = _NonLiteral * _Literal2', '_Literal1 / _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_Literal1 = _NonLiteral / _Literal2', '_Literal1 * _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_Literal1 =_NonLiteral - _Literal2',  '_Literal1 + _Literal2 = _NonLiteral' ) );

// addRule( new TARuleFromString( '_NonLiteral + _Literal2 = _Literal1 ', '_Literal1 - _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_NonLiteral * _Literal2 = _Literal1 ', '_Literal1 / _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_NonLiteral / _Literal2 = _Literal1 ', '_Literal1 * _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_NonLiteral - _Literal2 = _Literal1',  '_Literal1 + _Literal2 = _NonLiteral' ) );

// addRule( new TARuleFromString( '_NonLiteral - _Literal2 = _Literal1 ', '_Literal1 + _Literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_Literal2 - _NonLiteral = _Literal1 ', '_Literal2 - _Literal1 = _NonLiteral' ) );

// addRule( new TARuleFromString( '_Literal1 = sin( _NonLiteral )', 'asin( _Literal1 ) = _NonLiteral' ) );
// addRule( new TARuleFromString( '_Literal1 = cos( _NonLiteral )', 'acos( _Literal1 ) = _NonLiteral' ) );
// addRule( new TARuleFromString( '_Literal1 = tan( _NonLiteral )', 'atan( _Literal1 ) = _NonLiteral' ) );

// addRule( new TARuleFromString( '_Literal1 = ln( _1 )', 'exp( _Literal1 ) = _1' ) );
// addRule( new TARuleFromString( 'ln( _1 ) = _Literal1', 'exp( _Literal1 ) = _1' ) );

// addRule( new TARuleFromString( '_Literal1 = _NonLiteral', '_NonLiteral = _Literal1' ) );

// addRule( new TARuleFromString( '( _Literal1 / _2 ) = _Literal2', '_Literal1 / _Literal2 = _2 ' ) );

//
//      addRule( new TARuleFromString( '_Literal1+(_Literal2+_1)', '_1+(_Literal1+_Literal2)' ) );
//

//
// addRule( new TARuleFromString( '(_Literal1 * _1 ) / _Literal2', '(_Literal1 * _Literal2 ) / _1' ) );

// addRule( new TARuleFromString( '_literal1 * _NonLiteral = _literal2', '_literal2 / _literal1 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_literal1 + _NonLiteral = _literal2', '_literal2 - _literal1 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_literal1 - _NonLiteral = _literal2', '_literal1 - _literal2 = _NonLiteral' ) );
// addRule( new TARuleFromString( '_literal1 / _NonLiteral = _literal2', '_literal1 * _literal2 = _NonLiteral' ) );

// addRule( new TARuleFromString( '(_1+_2)+_3', '_1+(_2+_3)' ) );
// addRule( new TARuleFromString( '(_1*_2)*_3', '_1*(_2*_3)' ) );
