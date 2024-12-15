import assert from "assert"
import { Nullable } from "tsdef"

import { BinaryExpression, Expression, Node, NumericLiteral, StringLiteral } from "@december/tree/tree"
import { getTokenKind, ArtificialToken } from "@december/tree/token"

import Parser, { BindingPower, SyntacticalContext, LEDParser, createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "@december/tree/parser"
import { DEFAULT_BINDING_POWERS, DEFAULT_PARSERS } from "@december/tree/parser/grammar/default"

import Interpreter, { DEFAULT_EVALUATE, Environment, EvaluationFunction, isNumericValue, ParseToNodeFunction, RuntimeValue, createNumericValue, DEFAULT_RUNTIME_TO_NODE, InterpreterOptions } from "@december/tree/interpreter"
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

// #region NODES

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

// #region SYNTATICAL GRAMMAR

// override @ parseImplicitMultiplication
export const parseImplicitMultiplication: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  assert(left.type === `NumericLiteral`, `Left must be a numeric literal expression`)
  const numericLiteral = left as NumericLiteral

  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, context)

  // 1. Check if right is a dice roll expression
  const content = right.getContent().trim()
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

export const DICE_MODULAR_PARSERS_INDEX = { parseImplicitMultiplication, parseStringExpression } as const
export type DiceParserFunctionIndex = typeof DICE_MODULAR_PARSERS_INDEX
export const DICE_MODULAR_SYNTACTICAL_GRAMMAR: SyntacticalGrammarEntry<DiceParserFunctionIndex>[] = [
  ...createRegisterParserEntriesFromIndex<DiceParserFunctionIndex>(DICE_MODULAR_PARSERS_INDEX, true), //
]

// #endregion

// #endregion

// #region INTERPRETER

// #region OPTIONS

export interface DiceInterpreterOptions extends InterpreterOptions {
  rollDice?: boolean
}

// #endregion

// #region VALUE TYPES

export interface DiceRollValue<TNode extends Node = Node> extends RuntimeValue<Nullable<number[]>, TNode> {
  type: `diceRoll`
  value: Nullable<number[]> // rolled rolls
  // wasRolled: () => this.value !== null
  size: number
  faces: number
  keep?: DiceKeep
}

export function isDiceRollValue(value: RuntimeValue<any>): value is DiceRollValue {
  return value.type === `diceRoll`
}

export const toExpression: ParseToNodeFunction<DiceRollValue> = (i, diceRollValue: DiceRollValue<DiceRollExpression>): Expression => {
  const wasRolled = diceRollValue.value !== null
  if (!wasRolled) {
    const leftNumericLiteral = i.runtimeValueToNode(i, createNumericValue(diceRollValue.size, diceRollValue.node.size)) as Expression
    assert(leftNumericLiteral.type === `NumericLiteral`, `Left NumericLiteral must be a NumericLiteral node`)

    return new DiceRollExpression(leftNumericLiteral, diceRollValue.faces, diceRollValue.keep)
  }

  // throw new Error(`No reason to convert a ROLLED dice roll value to an expression.`) // TODO: Make this an option
  const total = sum(diceRollValue.value)
  return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), total.toString()))
}

// #endregion

// #region EVALUATION

export const evaluateWithDice: EvaluationFunction = (i: Interpreter<DiceInterpreterOptions>, node: Node, environment: Environment): RuntimeValue<any> | Node => {
  if ((node.type as string) === `DiceRollExpression`) {
    const diceRollExpression = node as DiceRollExpression

    const size = i.evaluate(i, diceRollExpression.size, environment)
    if (!isNumericValue(size)) return node

    const faces = diceRollExpression.faces
    const keep = diceRollExpression.keep

    let rolls: Nullable<number[]> = null

    // ONLY ROLL DICE if explicity asked to
    if (i.options.rollDice) {
      rolls = []
      for (let i = 0; i < size.value; i++) rolls.push(Math.floor(Math.random() * faces) + 1)
    }

    const diceRoll: DiceRollValue = {
      node,
      type: `diceRoll`,
      value: rolls,
      size: size.value,
      faces,
    }

    if (keep && Object.keys(keep).length > 0) diceRoll.keep = keep

    return diceRoll
  }

  return DEFAULT_EVALUATE(i, node, environment)
}

export const runtimeValueToNodeWithDice: ParseToNodeFunction<RuntimeValue<any>> = (i: Interpreter, value: RuntimeValue<any>): Node => {
  if (isDiceRollValue(value)) return toExpression(i, value)

  return DEFAULT_RUNTIME_TO_NODE(i, value)
}

// #endregion

// #endregion
