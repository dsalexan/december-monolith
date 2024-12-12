import { Interpreter } from "../../../../packages/tree/src"
import { typing } from "@december/utils"
import { isBoolean } from "lodash"
import { z } from "zod"

export class Dice extends Interpreter.Units.NumericUnitDecorator {
  __type: { NumericUnitDecorator: true; Dice: true } = { NumericUnitDecorator: true, Dice: true }

  // value: number
  // unit?: UnitSignature
  sides: number

  // TODO: make it math-enabled
  modifier?: number

  get count() {
    return this.value
  }

  get label() {
    const dice = this.unit!

    return Dice.label(dice.symbol, this.count, this.modifier)
  }

  toString(): string {
    const dice = this.unit!

    return Dice.label(dice.symbol, this.count, this.modifier || undefined)
  }

  constructor(sides: number, count?: number, modifier?: number) {
    // TODO: Implement different sided die
    if (sides !== 6) debugger

    const dice = Interpreter.Units.DICE
    const unit = dice.signature

    super(count ?? 1, unit)

    this.sides = sides
    this.modifier = modifier
  }

  /** FACTORY */
  static d6(count: number, modifier?: number): Dice {
    return new Dice(6, count, modifier)
  }

  /** STATIC */
  static label(dice: string, count?: number, modifier?: number): string
  static label(_dice: string, _count?: number, _modifier?: number): string {
    const dice = `${_dice}`

    let count = ``
    if (_count !== undefined) count = `${_count}`

    let modifier = ``
    if (_modifier !== undefined) modifier = `${_modifier >= 0 ? `+` : ``}${_modifier}`

    return `${count}${dice}${modifier}`
  }

  static isDice(value: any): value is Dice {
    return typing.isOfType<Dice>(value, `Dice`)
  }

  calculate() {
    debugger
    return -1
  }

  average(modifier: number | boolean = false) {
    const average = (this.sides + 1) / 2

    let _modifier = isBoolean(modifier) ? this.modifier ?? 0 : modifier

    return average * this.count + _modifier
  }

  clone() {
    return new Dice(this.sides, this.count, this.modifier)
  }

  operation(operator: Interpreter.Units.Operation, B: Interpreter.Units.NumericUnitDecorator) {
    // TODO: Implement/test dice operations
    debugger

    return super.operation(operator, B)
  }
}

export const DiceSchema = z.instanceof(Dice)
