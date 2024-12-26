import assert from "assert"
import { MaybeUndefined, Nullable } from "tsdef"
import { sum } from "lodash"

import { BinaryExpression, Expression, ExpressionStatement, Node, NumericLiteral, StringLiteral } from "@december/tree/tree"

import { GraphRewritingRule, createGraphRewritingRule, PatternTargetMatch } from "@december/tree/rewriter"
import { isBinaryExpression, isLiteral, isNumericLiteral } from "@december/tree/utils/guards"
import { makeConstantLiteral } from "@december/tree/utils/factories"
import { DiceRollExpression } from "./parser"

export const DICE_RULESET: GraphRewritingRule[] = []

// _DiceRoll1 * _Literal -> _DiceRoll2
// _Literal * _DiceRoll1 -> _DiceRoll2
DICE_RULESET.push(
  createGraphRewritingRule(
    `LITERAL_MULTIPLICATING_DICE_ROLL`,
    node => {
      if (!isBinaryExpression(node, `*`)) return false

      if (DiceRollExpression.isDiceRollExpression(node.left) && isNumericLiteral(node.right) && isNumericLiteral(node.left.size)) return { target: `A` }
      if (isNumericLiteral(node.left) && DiceRollExpression.isDiceRollExpression(node.right) && isNumericLiteral(node.right.size)) return { target: `B` }

      return false
    },
    (node: BinaryExpression, { match }: { match: PatternTargetMatch }) => {
      let _DR1: DiceRollExpression, _L: NumericLiteral

      if (match.target === `A`) {
        _DR1 = node.left as DiceRollExpression
        _L = node.right as NumericLiteral
      } else {
        _DR1 = node.right as DiceRollExpression
        _L = node.left as NumericLiteral
      }

      const size = _L.getValue() * (_DR1.size as NumericLiteral).getValue()
      const SIZE = makeConstantLiteral(size)
      return new DiceRollExpression(SIZE, _DR1.faces, _DR1.keep)
    },
  ),
)
