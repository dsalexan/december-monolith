import assert from "assert"
import { MaybeUndefined, Nilable, Nullable, WithOptionalKeys } from "tsdef"
import { sum } from "lodash"

import { SyntacticalContext } from "@december/tree"
import { BinaryExpression, Expression, ExpressionStatement, Node, NumericLiteral, StringLiteral } from "@december/tree/tree"
import { isBinaryExpression, isNumericLiteral, isPrefixExpression } from "@december/tree/utils/guards"

import Interpreter, {
  Environment,
  RuntimeValue,
  InterpreterOptions,
  EvaluationFunction,
  NodeConversionFunction,
  PostProcessFunction,
  DEFAULT_NODE_CONVERSORS,
  DEFAULT_EVALUATIONS,
  DEFAULT_POST_PROCESS,
  NumericValue,
  EvaluationOutput,
  RuntimeEvaluation,
} from "@december/tree/interpreter"

import { makeConstantLiteral } from "@december/tree/utils/factories"

import { DiceInterpreterOptions } from "@december/system/dice"

import { GCABonusTargetToString, GCABonusToString, IGURPSBonusTarget } from "./bonus"
import { GCABonusExpression } from "./parser"

/**
 * HOW TO EVALUATE A GCA BONUS
 *
 * 1. Evaluate bonus
 *  1.A. Evaluate maximum
 *      - do it last
 * 2. Evaluate targets
 *      - Probably gonna need to store targets in environment (to reference "Target" in exceptions)
 * 4. Evaluate exceptions
 *      - check exception for each individual target
 */

/**
 * GCA BONUS
 *
 * (A/B) Targets
 *    - trait
 *    - tag
 *    - textConcacenation
 *
 * (A/B) Bonus
 *    - singleBonus
 *    - bonus
 *    - maximum
 *    - source
 *    - description
 *    - listAs
 *
 * (C) Exceptions
 *    - unless
 *    - onlyIf
 */

// #region   OPTIONS

// #endregion

// #region    VALUE TYPES

// export class GCABonus

//** value: final bonus value; when nullable => bonus not ready */
export class GCABon1usValue extends RuntimeValue<Nullable<number>> {
  type = `GCABonus` as any
  bonus: IGURPSBonus

  constructor(bonus: IGURPSBonus) {
    super(null)

    this.bonus = bonus
  }

  public static isGCABonusValue(value: RuntimeValue<any>): value is GCABonusValue {
    return value.type === (`GCABonus` as any)
  }

  public static IsReadyDiceRollValue(value: RuntimeValue<any>): value is GCABonusValue & Required<Pick<GCABonusValue, `value`>> {
    return GCABonusValue.isGCABonusValue(value) && value.isReady()
  }

  public isReady(): boolean {
    return this.value !== null
  }

  public getContent(): string {
    const content = GCABonusToString(this.bonus)

    return content
  }
}

export class GCABonusTarget extends RuntimeValue<IGURPSBonusTarget> {
  type = `GCABonusTarget` as any

  constructor(target: IGURPSBonusTarget) {
    super(target)
  }

  public static isGCABonusTarget(value: RuntimeValue<any>): value is GCABonusTarget {
    return value.type === (`GCABonusTarget` as any)
  }

  public getContent(): string {
    const content = GCABonusTargetToString(this.value)

    return content
  }
}

// #endregion

// #region    EVALUATOR

// override @ evaluate
export const evaluate: EvaluationFunction = (i: Interpreter<any, DiceInterpreterOptions>, node: Node, environment: Environment): EvaluationOutput => {
  if (GCABonusExpression.isGCABonusExpression(node)) {
    const singleBonus = node.singleBonus ?? false

    const bonus = i.evaluator.evaluate(i, node.bonus, environment)
    const targets = i.evaluator.evaluate(i, node.bonus, environment)

    if (!bonus.isResolved() || !targets.isResolved()) {
      debugger
    }

    const source = !node.source ? undefined : i.evaluator.evaluate(i, node.source, environment)
    const maximum = !node.maximum ? undefined : i.evaluator.evaluate(i, node.maximum, environment)
    const description = !node.description ? undefined : i.evaluator.evaluate(i, node.description, environment)
    const reason = !node.reason ? undefined : i.evaluator.evaluate(i, node.reason, environment)

    const unless = !node.unless ? undefined : i.evaluator.evaluate(i, node.unless, environment)
    const onlyIf = !node.onlyIf ? undefined : i.evaluator.evaluate(i, node.onlyIf, environment)

    assert(source === undefined, `Source not implemented`)
    assert(maximum === undefined, `Maximum not implemented`)
    assert(node.byMode === undefined, `ByMode not implemented`)

    assert(unless === undefined, `Unless not implemented`)
    assert(onlyIf === undefined, `OnlyIf not implemented`)

    debugger
  }

  return DEFAULT_EVALUATIONS.evaluate(i, node, environment)
}

// override @ convertToNode
export const convertToNode: NodeConversionFunction<Node, RuntimeValue<any>> = (i: Interpreter, value: RuntimeValue<any>, sourceNode: Nullable<Node>): Node => {
  if (GCABonusValue.isGCABonusValue(value)) {
    debugger
  }

  return DEFAULT_NODE_CONVERSORS.convertToNode(i, value, sourceNode)
}

// override @ postProcess
// export const postProcess: PostProcessFunction = (i: Interpreter<any, DiceInterpreterOptions>, evaluation: RuntimeEvaluation<RuntimeValue<any>, Expression>, syntacticalContext: SyntacticalContext): Nilable<RuntimeValue<any>> => {
//   const { node, runtimeValue } = evaluation

//   if (i.options.rollDice) {
//     if (runtimeValue && DiceRollValue.isDiceRollValue(runtimeValue) && !runtimeValue.wasRolled()) debugger // ops, no dice rolls
//   }

//   // ONLY relevant if there were no dice rolls
//   if (!i.options.rollDice) {
//     if (runtimeValue === null) {
//       assert(Expression.isExpression(node), `Node must be an expression`)

//       if (DiceNotationValue.isValidDiceNotation(node)) return new DiceNotationValue(node)
//     }
//   }

//   return DEFAULT_POST_PROCESS.postProcess(i, evaluation, syntacticalContext)
// }

export const GCA_BONUS_MODULAR_EVALUATOR_PROVIDER = { evaluations: { evaluate }, conversions: { convertToNode } }
export type GCABonusModularEvaluatorProvider = (typeof GCA_BONUS_MODULAR_EVALUATOR_PROVIDER)[`evaluations`]

// #endregion
