import assert from "assert"
import { MaybeUndefined, Nullable } from "tsdef"

import { BinaryExpression, Expression, Node, NumericLiteral, StringLiteral } from "@december/tree/tree"
import { getTokenKind, ArtificialToken } from "@december/tree/token"

import Parser, { BindingPower, SyntacticalContext, LEDParser, createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "@december/tree/parser"
import { DEFAULT_BINDING_POWERS, DEFAULT_PARSERS } from "@december/tree/parser/grammar/default"

import Interpreter, {
  Environment,
  isNumericValue,
  RuntimeValue,
  createNumericValue,
  InterpreterOptions,
  NodeConversionFunction,
  EvaluationFunction,
  DEFAULT_NODE_CONVERSORS,
  DEFAULT_EVALUATIONS,
  NumericValue,
} from "@december/tree/interpreter"
import { sum } from "lodash"

/**
 * DICE NOTATION
 *
 * AdXk[hlc]Y
 *
 * A: number of dice
 * X: number of faces
 *
 * kh, kl, kc: keep some dice; h: highest, l: lowest, c: player's choice
 * Y: number of dice to keep
 *
 */

export interface DiceKeep {
  highest?: number
  lowest?: number
  playersChoice?: number
}

export function areDiceKeepEquals(A: MaybeUndefined<DiceKeep>, B: MaybeUndefined<DiceKeep>) {
  const keys = [`highest`, `lowest`, `playersChoice`] as const
  for (const key of keys) {
    const a = A?.[key] ?? 0
    const b = B?.[key] ?? 0

    if (a !== b) return false
  }

  return true
}

export interface DiceData {
  faces: number
  keep?: DiceKeep
}

export function parseDiceNotation(notation: string): Nullable<DiceData> {
  const match = notation.match(/^(d\d+)(k[hlc]\d+)?(k[hlc]\d+)?(k[hlc]\d+)?$/i)
  if (match) {
    const [_, d, k1, k2, k3] = match
    const keeps = [k1, k2, k3]

    const faces = parseInt(d.slice(1))
    assert(!isNaN(faces), `Faces must be a number`)

    const keep: DiceKeep = {}
    for (const k of keeps) {
      if (k === undefined || k.trim().length === 0) continue

      const FT = k.slice(0, 2).toLocaleLowerCase()
      let mode: keyof DiceKeep
      if (FT === `kh`) mode = `highest`
      else if (FT === `kl`) mode = `lowest`
      else if (FT === `kc`) mode = `playersChoice`
      //
      else throw new Error(`Unimplement dice keep mode "${FT}"`)

      const value = parseInt(k.slice(2))
      assert(!isNaN(value), `Dice keep rule must be a number`)

      keep[mode] = value
    }

    return { faces, keep }
  }

  return null
}

// #region PARSER

// #region    NODES

export class DiceRollExpression extends Expression {
  public type = `DiceRollExpression` as any
  public readonly faces: number // number of faces
  public readonly keep: {
    highest?: number
    lowest?: number
    playersChoice?: number // TODO: implement
  }

  constructor(size: Expression, faces: number, keep?: DiceKeep) {
    super()

    this.faces = faces
    this.keep = keep ?? {}

    this.addChild(size, 0, `size`)
  }

  public get size(): Expression {
    return this.children[0] as Expression
  }

  public override toString() {
    const { size, faces } = this

    let keep = ``
    if (this.keep.highest) keep = `kh${this.keep.highest}`
    if (this.keep.lowest) keep = `kl${this.keep.lowest}`
    if (this.keep.playersChoice) keep = `kc${this.keep.playersChoice}`

    return `${size.toString()}d${faces}${keep}`
  }

  public override getContent(): string {
    return this.toString()
  }

  public override getDebug(): string {
    return this.toString()
  }
}

// #endregion

// #region    SYNTATICAL GRAMMAR

// override @ parseImplicitMultiplication
export const parseImplicitMultiplication: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  assert(left.type === `NumericLiteral`, `Left must be a numeric literal expression`)
  const numericLiteral = left as NumericLiteral

  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, context)

  // 1. Check if right is a dice roll expression
  const content = right.getContent({ separator: ``, wrap: false }).trim()
  const diceData = parseDiceNotation(content)
  if (diceData) return new DiceRollExpression(numericLiteral, diceData.faces, diceData.keep)

  // 2. Not a dice roll, just return a multiplication
  const operator = new ArtificialToken(getTokenKind(`asterisk`), `*`)

  return new BinaryExpression(numericLiteral, operator, right)
}

// override @ parseStringExpression
export const parseStringExpression = (p: Parser, stringLiteral: StringLiteral, context: SyntacticalContext): Expression => {
  // transforms StringLiteral in other shit
  const content = stringLiteral.getContent().trim()
  const diceData = parseDiceNotation(content)
  if (diceData) {
    const oneNumericLiteral = new NumericLiteral(new ArtificialToken(getTokenKind(`number`), `1`))
    return new DiceRollExpression(oneNumericLiteral, diceData.faces, diceData.keep)
  }

  return DEFAULT_PARSERS.parseStringExpression(p, stringLiteral, context)
}

export const DICE_MODULAR_PARSER_PROVIDER = { parseImplicitMultiplication, parseStringExpression }
export type DiceModularParserProvider = typeof DICE_MODULAR_PARSER_PROVIDER

export const DICE_MODULAR_SYNTACTICAL_GRAMMAR: SyntacticalGrammarEntry<DiceModularParserProvider>[] = [
  ...createRegisterParserEntriesFromIndex<DiceModularParserProvider>(DICE_MODULAR_PARSER_PROVIDER, true), //
]

// #endregion

// #endregion

// #region INTERPRETER

// #region    OPTIONS

export interface DiceInterpreterOptions extends InterpreterOptions {
  rollDice?: boolean
}

// #endregion

// #region    VALUE TYPES

export interface DiceRollValue<TNode extends Node = Node> extends RuntimeValue<Nullable<number[]>, TNode> {
  type: `diceRoll`
  value: Nullable<number[]> // rolled rolls
  // wasRolled: () => this.value !== null
  size: number
  faces: number
  keep?: DiceKeep
}

export function addDiceRolls(A: DiceRollValue, B: DiceRollValue, node: Node, negate: boolean = false): DiceRollValue {
  assert(A.faces === B.faces, `Dice rolls must have the same number of faces`)
  assert(areDiceKeepEquals(A.keep, B.keep), `Dice rolls must have the same keep rules`)

  const size = negate ? A.size - B.size : A.size + B.size
  return createDiceRollValue(size, A.faces, node, { keep: { ...(A.keep ?? {}) } })
}

export function isDiceRollValue(value: RuntimeValue<any>): value is DiceRollValue {
  return value.type === `diceRoll`
}

export function createDiceRollValue(size: number, faces: number, node: Node, { keep, value }: Partial<Pick<DiceRollValue, `keep` | `value`>>): DiceRollValue {
  const diceRoll: DiceRollValue = { type: `diceRoll`, value: value ?? null, size, faces, node }
  if (keep && Object.keys(keep).length > 0) diceRoll.keep = keep

  return diceRoll
}

export const convertDiceToExpression: NodeConversionFunction<DiceRollValue> = (i, diceRollValue: DiceRollValue<DiceRollExpression>): Expression => {
  const wasRolled = diceRollValue.value !== null
  if (!wasRolled) {
    const leftNumericLiteral = i.evaluator.convertToNode(i, createNumericValue(diceRollValue.size, diceRollValue.node.size)) as Expression
    assert(leftNumericLiteral.type === `NumericLiteral`, `Left NumericLiteral must be a NumericLiteral node`)

    return new DiceRollExpression(leftNumericLiteral, diceRollValue.faces, diceRollValue.keep)
  }

  // throw new Error(`No reason to convert a ROLLED dice roll value to an expression.`) // TODO: Make this an option
  const total = sum(diceRollValue.value)
  return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), total.toString()))
}

// #endregion

// #region    EVALUATOR

// override @ evaluate
export const evaluate: EvaluationFunction = (i: Interpreter<any, DiceInterpreterOptions>, node: Node, environment: Environment): RuntimeValue<any> | Node => {
  if ((node.type as string) === `DiceRollExpression`) {
    const diceRollExpression = node as DiceRollExpression

    const size = i.evaluator.evaluate(i, diceRollExpression.size, environment)
    if (!isNumericValue(size)) return node

    const faces = diceRollExpression.faces
    const keep = diceRollExpression.keep

    let rolls: Nullable<number[]> = null

    // ONLY ROLL DICE if explicity asked to
    if (i.options.rollDice) {
      rolls = []
      for (let i = 0; i < size.value; i++) rolls.push(Math.floor(Math.random() * faces) + 1)
    }

    return createDiceRollValue(size.value, faces, node, { keep, value: rolls })
  }

  return DEFAULT_EVALUATIONS.evaluate(i, node, environment)
}

// override @ evaluateCustomOperation
export const evaluateCustomOperation = (left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string, node: Node): MaybeUndefined<RuntimeValue<any> | Node> => {
  const allDiceRollsOrNumeric = [left, right].every(value => isDiceRollValue(value) || isNumericValue(value))

  if (allDiceRollsOrNumeric) {
    if ([`+`, `-`].includes(operator)) {
      // ADDITIVE only for same types AND same faces AND same keeps
      if (!isDiceRollValue(left) || !isDiceRollValue(right)) return node
      if (left.faces !== right.faces) return node
      if (!areDiceKeepEquals(left.keep, right.keep)) return node

      if (left.value || right.value) debugger // TODO: what to do with this?

      return addDiceRolls(left, right, node, operator === `-`)
    }

    if ([`*`, `/`].includes(operator)) {
      if (isDiceRollValue(left) && isDiceRollValue(right)) return node // MULTIPLICATIVE only for NUMERIC and DICE (whatever the order)

      const numericValue: NumericValue = isNumericValue(left) ? left : (right as NumericValue)
      const diceRollValue: DiceRollValue = isDiceRollValue(left) ? left : (right as DiceRollValue)

      if (diceRollValue.value) debugger // TODO: what to do with this?

      let factor = numericValue.value // operator === '*'
      if (operator === `/`) {
        // DIVIDEND / DIVISOR
        const dividend = isNumericValue(left) ? left : right
        const divisor = isNumericValue(left) ? right : left

        // TODO: Implement this kkkkkkk
        debugger
      }
      //
      else if (operator !== `*`) throw new Error(`Operator not implemented: ${operator}`)

      const newSize = diceRollValue.size * factor
      assert(!isNaN(newSize), `New size must be a number`)

      return createDiceRollValue(newSize, diceRollValue.faces, node, { keep: diceRollValue.keep })
    }

    throw new Error(`Operator not implemented: ${operator}`)
  }

  return DEFAULT_EVALUATIONS.evaluateCustomOperation(left, right, operator, node)
}

// override @ convertToNode
export const convertToNode: NodeConversionFunction<RuntimeValue<any>> = (i: Interpreter, value: RuntimeValue<any>): Node => {
  if (isDiceRollValue(value)) return convertDiceToExpression(i, value)

  return DEFAULT_NODE_CONVERSORS.convertToNode(i, value)
}

export const DICE_MODULAR_EVALUATOR_PROVIDER = { evaluate, evaluateCustomOperation, convertToNode }
export type DiceModularEvaluatorProvider = typeof DICE_MODULAR_EVALUATOR_PROVIDER

// #endregion

// #endregion
