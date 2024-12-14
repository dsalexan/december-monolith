import { Nullable } from "tsdef"

import { BinaryExpression, Expression, NumericLiteral } from "@december/tree/tree"
import { getTokenKind, ArtificialToken } from "@december/tree/token"

import Parser, { BindingPower, SyntacticalContext, LEDParser } from "@december/tree/parser"
import { DEFAULT_BINDING_POWERS } from "@december/tree/parser/grammar/default"

import { ParseToNodeFunction, RuntimeValue } from "@december/tree/interpreter"
import { createRegisterParserEntry } from "../../parser/grammar"
import { createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "../../parser/grammar/entries"
import assert from "assert"

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

// #region PARSER

// #region NODES

export class DiceRollExpression extends Expression {
  public type = `DiceRollExpression` as any
  public readonly size: Expression // number of die, usually just a NumericLiteral
  public readonly faces: number // number of faces
  public readonly keep: {
    highest?: number
    lowest?: number
    playersChoice?: number // TODO: implement
  }

  constructor(size: Expression, faces: number, keep?: DiceKeep) {
    super()

    this.size = size
    this.faces = faces
    this.keep = keep ?? {}
  }

  public override toString() {
    const { size, faces } = this

    let keep = ``
    if (this.keep.highest) keep = `kh${this.keep.highest}`
    if (this.keep.lowest) keep = `kl${this.keep.lowest}`
    if (this.keep.playersChoice) keep = `kc${this.keep.playersChoice}`

    return `${size}d${faces}${keep}`
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
  const match = content.match(/^(d\d+)(k[hlc]\d+)?(k[hlc]\d+)?(k[hlc]\d+)?$/i)
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

    return new DiceRollExpression(numericLiteral, faces, keep)
  }

  // 2. Not a dice roll, just return a multiplication
  const operator = new ArtificialToken(getTokenKind(`asterisk`), `*`)

  return new BinaryExpression(numericLiteral, operator, right)
}

export const DICE_MODULAR_PARSERS_INDEX = { parseImplicitMultiplication } as const
export type DiceParserFunctionIndex = typeof DICE_MODULAR_PARSERS_INDEX
export const DICE_MODULAR_SYNTACTICAL_GRAMMAR: SyntacticalGrammarEntry<DiceParserFunctionIndex>[] = [
  ...createRegisterParserEntriesFromIndex<DiceParserFunctionIndex>(DICE_MODULAR_PARSERS_INDEX, true), //
]

// #endregion

// #endregion

// #region INTERPRETER

// #region VALUE TYPES

export interface DiceRollValue extends RuntimeValue<Nullable<number[]>> {
  type: `diceRoll`
  value: Nullable<number[]> // rolled rolls
  // wasRolled: () => this.value !== null
  size: number
  faces: number
  keep?: DiceKeep
}

export function isDiceValue(value: RuntimeValue<any>): value is DiceRollValue {
  return value.type === `diceRoll`
}

export const toExpression: ParseToNodeFunction<DiceRollValue> = (i, diceRollValue: DiceRollValue): Expression => {
  const wasRolled = diceRollValue.value !== null
  if (!wasRolled) {
    const leftNumericLiteral = i.runtimeValueToNode(i, { type: `number`, value: diceRollValue.size }) as Expression
    assert(leftNumericLiteral.type === `NumericLiteral`, `Left NumericLiteral must be a NumericLiteral node`)

    return new DiceRollExpression(leftNumericLiteral, diceRollValue.faces, diceRollValue.keep)
  }

  throw new Error(`No reason to convert a ROLLED dice roll value to an expression.`)
}

// #endregion

// #endregion
