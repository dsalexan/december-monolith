import assert from "assert"
import { MaybeUndefined, Nullable } from "tsdef"
import { cloneDeep, isNumber, sum } from "lodash"

import { BinaryExpression, Expression, ExpressionStatement, Node, NumericLiteral, StringLiteral } from "@december/tree/tree"
import { getTokenKind, ArtificialToken } from "@december/tree/token"
import { makeConstantLiteral } from "@december/tree/utils/factories"
import { Token } from "@december/tree/token/core"

import Parser, { BindingPower, SyntacticalContext, LEDParser, createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "@december/tree/parser"
import { DEFAULT_BINDING_POWERS, DEFAULT_PARSERS } from "@december/tree/parser/grammar/default"

import { areDiceKeepEquals, DiceKeep, parseDiceNotation } from "./dice"

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
    this.tags.push(`literal`)

    this.faces = faces
    this.keep = keep ?? {}

    this.addChild(size, 0, `size`)
  }

  public override constructClone(options): this {
    return new DiceRollExpression(this.size.clone(options), this.faces, this.keep ? cloneDeep(this.keep) : undefined) as this
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

  public static isDiceRollExpression(value: Node): value is DiceRollExpression {
    return (value as any).type === (`DiceRollExpression` as any)
  }

  // TODO: Maybe move this elsewhere?
  public plus(value: number | DiceRollExpression): BinaryExpression | DiceRollExpression {
    const PLUS = new ArtificialToken(getTokenKind(`plus`), `+`)
    const MINUS = new ArtificialToken(getTokenKind(`dash`), `-`)

    let right: Expression, operator: Token

    if (isNumber(value)) {
      if (value === 0) return this

      right = makeConstantLiteral(Math.abs(value))
      operator = value < 0 ? MINUS : PLUS
    } else {
      right = value
      operator = PLUS
    }

    return new BinaryExpression(this, operator, right)
  }
}

// #endregion

// #region    SYNTATICAL GRAMMAR

// override @ parseImplicitMultiplication
//    (here we override the function entirely to avoid calling parseExpression twice for the right side)
export const parseImplicitMultiplication: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  assert(left.type === `NumericLiteral`, `Left must be a numeric literal expression`)
  const numericLiteral = left as NumericLiteral

  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, context)

  // 1. Check if right is a dice roll expression
  const content = right.getContent({ separator: ``, wrap: false }).trim()
  const diceData = parseDiceNotation(content)
  if (diceData) return new DiceRollExpression(numericLiteral, diceData.faces, diceData.keep)

  // 2. Check if we should concatenate as a string, not a multiplication TODO:

  // 3. Not a dice roll, just return a multiplication
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
