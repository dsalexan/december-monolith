import assert from "assert"
import { MaybeUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { sum } from "lodash"

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

import { areDiceKeepEquals, DiceKeep, parseDiceNotation } from "./dice"
import { DiceRollExpression } from "./parser"
import { SyntacticalContext } from "../../../tree/src"

// #region    OPTIONS

export interface DiceInterpreterOptions extends WithOptionalKeys<InterpreterOptions, `logger`> {
  rollDice?: boolean
}

// #endregion

// #region    VALUE TYPES

export class DiceRollValue extends RuntimeValue<Nullable<number[]>> {
  type = `diceRoll` as any
  size: number
  faces: number
  keep?: DiceKeep

  constructor(size: number, faces: number, { keep, rolls }: { keep?: DiceKeep; rolls?: Nullable<number[]> } = {}) {
    super(null)
    this.size = size
    this.faces = faces
    if (keep) this.keep = { ...keep }

    if (rolls) {
      assert(rolls.length === size, `Rolls must have the same size as the dice roll`)
      this.value = [...rolls]
    }
  }

  public wasRolled(): boolean {
    return this.value !== null
  }

  public static isDiceRollValue(value: RuntimeValue<any>): value is DiceRollValue {
    return value.type === (`diceRoll` as any)
  }

  public static IsRolledDiceRollValue(value: RuntimeValue<any>): value is DiceRollValue & Required<Pick<DiceRollValue, `value`>> {
    return DiceRollValue.isDiceRollValue(value) && value.wasRolled()
  }

  /** Add dice rolls */
  public add(diceRoll: DiceRollValue, negate: boolean = false): DiceRollValue {
    assert(this.faces === diceRoll.faces, `Dice rolls must have the same number of faces`)
    assert(areDiceKeepEquals(this.keep, this.keep), `Dice rolls must have the same keep rules`)

    const size = negate ? this.size - diceRoll.size : this.size + diceRoll.size
    return new DiceRollValue(size, this.faces, { keep: { ...(this.keep ?? {}) } })
  }

  public getNotation(): string {
    const { size, faces } = this

    let keep = ``
    if (this.keep) {
      if (this.keep.highest) keep = `kh${this.keep.highest}`
      if (this.keep.lowest) keep = `kl${this.keep.lowest}`
      if (this.keep.playersChoice) keep = `kc${this.keep.playersChoice}`
    }

    return `${size.toString()}d${faces}${keep}`
  }

  public override getContent(): string {
    if (this.wasRolled()) {
      const roll = sum(this.value!)
      return `${roll} (${this.getNotation()})`
    }

    return this.getNotation()
  }
}

export class DiceNotationValue extends RuntimeValue<Expression> {
  type = `diceNotation` as any

  public get expression(): Expression {
    return this.value
  }

  constructor(expression: Expression) {
    super(expression)
    assert(expression instanceof Expression, `Dice Notation must be an expression`)
  }

  public static isDiceNotationValue(value: RuntimeValue<any>): value is DiceNotationValue {
    return value.type === (`diceNotation` as any)
  }

  /** Checks if an expression can be PART (or component) of a dice notation */
  public static isValidDiceNotationComponent(expression: Expression): boolean {
    if (isNumericLiteral(expression)) return true
    if (DiceRollExpression.isDiceRollExpression(expression)) return true
    if (DiceNotationValue.isValidDiceNotation(expression)) return true

    return false
  }

  /** Checks if an expression is a valid dice notation */
  public static isValidDiceNotation(expression: Expression): boolean {
    const isRootValid = isBinaryExpression(expression, [`+`, `-`, `*`, `/`]) || isPrefixExpression(expression, [`+`, `-`])

    if (isRootValid) {
      const isLeftValid = expression.type === `PrefixExpression` ? true : DiceNotationValue.isValidDiceNotationComponent((expression as BinaryExpression).left)
      const isRightValid = DiceNotationValue.isValidDiceNotationComponent(expression.right)

      return isLeftValid && isRightValid
    }

    return false
  }
}

// #endregion

// #region    EVALUATOR

// override @ evaluate
export const evaluate: EvaluationFunction = (i: Interpreter<any, DiceInterpreterOptions>, node: Node, environment: Environment): EvaluationOutput => {
  if (DiceRollExpression.isDiceRollExpression(node)) {
    // 1. Is size resolved?
    const size = i.evaluator.evaluate(i, node.size, environment)
    if (!RuntimeEvaluation.isResolved(size)) return new RuntimeEvaluation(node)

    const faces = node.faces
    const keep = node.keep

    let rolls: Nullable<number[]> = null

    // ONLY ROLL DICE if explicity asked to
    if (i.options.rollDice) {
      rolls = []
      for (let i = 0; i < size.runtimeValue.value; i++) rolls.push(Math.floor(Math.random() * faces) + 1)
    }

    // return createDiceRollValue(size.value, faces, node, { keep, value: rolls })
    return new DiceRollValue(size.runtimeValue.value, faces, { keep, rolls }).getEvaluation(node)
  }

  return DEFAULT_EVALUATIONS.evaluate(i, node, environment)
}

// override @ evaluateCustomOperation
export const evaluateCustomOperation = (left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string, node: Node): EvaluationOutput => {
  /**
   * Return "undefined" if no use case falls under this implementation
   */

  const allDiceRollsOrNumeric = [left, right].every(value => DiceRollValue.isDiceRollValue(value) || NumericValue.isNumericValue(value))

  if (allDiceRollsOrNumeric) {
    if ([`+`, `-`].includes(operator)) {
      // 1. Add two dices if they are "the same"
      if (DiceRollValue.isDiceRollValue(left) && DiceRollValue.isDiceRollValue(right)) {
        if (left.faces === right.faces) {
          if (areDiceKeepEquals(left.keep, right.keep)) return left.add(right, operator === `-`)
        }
      }

      if (DiceRollValue.IsRolledDiceRollValue(left) || DiceRollValue.IsRolledDiceRollValue(right)) debugger // TODO: what to do with this?

      // 2. No way to evaluate this yet, lacking implementation
      return new RuntimeEvaluation(node)
    }

    if ([`*`, `/`].includes(operator)) {
      // 1. MULTIPLICATIVE only for NUMERIC and DICE (whatever the order)
      if (DiceRollValue.isDiceRollValue(left) && DiceRollValue.isDiceRollValue(right)) return new RuntimeEvaluation(node)

      const numericValue: NumericValue = NumericValue.isNumericValue(left) ? left : (right as NumericValue)
      const diceRollValue: DiceRollValue = DiceRollValue.isDiceRollValue(left) ? left : (right as DiceRollValue)

      if (diceRollValue.wasRolled()) debugger // TODO: what to do with this?

      let factor = numericValue.value // operator === '*'
      if (operator === `/`) {
        // DIVIDEND / DIVISOR
        const dividend = NumericValue.isNumericValue(left) ? left : right
        const divisor = NumericValue.isNumericValue(left) ? right : left

        // TODO: Implement this kkkkkkk
        debugger
      }
      //
      else if (operator !== `*`) throw new Error(`Operator not implemented: ${operator}`)

      const newSize = diceRollValue.size * factor
      assert(!isNaN(newSize), `New size must be a number`)

      // return createDiceRollValue(newSize, diceRollValue.faces, node, { keep: diceRollValue.keep })
      return new DiceRollValue(newSize, diceRollValue.faces, { keep: diceRollValue.keep })
    }

    throw new Error(`Operator not implemented: ${operator}`)
  }

  return DEFAULT_EVALUATIONS.evaluateCustomOperation(left, right, operator, node)
}

// override @ convertToNode
export const convertToNode: NodeConversionFunction<Node, RuntimeValue<any>> = (i: Interpreter, value: RuntimeValue<any>): Node => {
  if (DiceRollValue.isDiceRollValue(value)) {
    // 1. If DiceRoll was NOT ROLLED, update tree and return an expression
    if (!value.wasRolled()) {
      const numberOfDice = new NumericValue(value.size)
      const leftNumericLiteral = i.evaluator.convertToNode<NumericLiteral>(i, numberOfDice)

      assert(leftNumericLiteral.type === `NumericLiteral`, `Left NumericLiteral must be a NumericLiteral node`)

      return new DiceRollExpression(leftNumericLiteral, value.faces, value.keep)
    }

    // throw new Error(`No reason to convert a ROLLED dice roll value to an expression.`) // TODO: Make this an option
    // 2. Already rolled dice could just yield a number, right?
    return makeConstantLiteral(sum(value.value))
  }

  if (DiceNotationValue.isDiceNotationValue(value)) return value.expression

  return DEFAULT_NODE_CONVERSORS.convertToNode(i, value)
}

// override @ postProcess
export const postProcess: PostProcessFunction = (i: Interpreter<any, DiceInterpreterOptions>, evaluation: RuntimeEvaluation<RuntimeValue<any>, Expression>, syntacticalContext: SyntacticalContext): Nullable<RuntimeValue<any>> => {
  const { node, runtimeValue } = evaluation

  if (i.options.rollDice) {
    if (runtimeValue && DiceRollValue.isDiceRollValue(runtimeValue) && !runtimeValue.wasRolled()) debugger // ops, no dice rolls
  }

  // ONLY relevant if there were no dice rolls
  if (!i.options.rollDice) {
    if (runtimeValue === null) {
      assert(Expression.isExpression(node), `Node must be an expression`)

      if (DiceNotationValue.isValidDiceNotation(node)) return new DiceNotationValue(node)
    }
  }

  return DEFAULT_POST_PROCESS.postProcess(i, evaluation, syntacticalContext)
}

export const DICE_MODULAR_EVALUATOR_PROVIDER = { evaluations: { evaluate, evaluateCustomOperation }, conversions: { convertToNode }, postProcess: { postProcess } }
export type DiceModularEvaluatorProvider = (typeof DICE_MODULAR_EVALUATOR_PROVIDER)[`evaluations`]

// #endregion
