import { assert } from "console"
import { isNumber } from "lodash"

import type Interpreter from "../.."

import { ArtificialToken, getTokenKind } from "../../../token"

import { BinaryExpression, BooleanLiteral, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../../tree"
import { createNumericValue, createUnitValue, isBooleanValue, isNumericValue, isQuantityValue, isStringValue, isUnitValue, NumericValue, RuntimeValue, UnitValue } from "../../valueTypes"
import { NodeConversionFunction } from ".."

export const convertToNode: NodeConversionFunction<RuntimeValue<any>> = (i: Interpreter<DefaultNodeConversionProvider>, value: RuntimeValue<any>): Node => {
  if (isBooleanValue(value)) return new BooleanLiteral(value.value)
  if (isNumericValue(value)) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), String(value.value)))
  if (isStringValue(value)) return new StringLiteral(new ArtificialToken(getTokenKind(`string`), value.value))
  if (isUnitValue(value)) return new UnitLiteral(value.value, new ArtificialToken(getTokenKind(`string`), value.value.symbol))
  if (isQuantityValue(value)) {
    if (value.node) debugger

    // assert(isNumber(value.value.value), `Quantity value must be a number.`)
    const numericValue = value.value.value as number
    assert(isNumber(numericValue), `Quantity value must be a number.`)

    const numericLeft = i.evaluator.convertToNode<NumericValue>(i, createNumericValue(numericValue, null as any)) as NumericLiteral
    const unitRight = i.evaluator.convertToNode<UnitValue>(i, createUnitValue(value.value.unit, null as any)) as UnitLiteral

    return new BinaryExpression(numericLeft, new ArtificialToken(getTokenKind(`asterisk`), `*`), unitRight)
  }

  throw new Error(`Cannot parse runtime value to expression string: ${value.type}`)
}

export const DEFAULT_NODE_CONVERSORS = {
  convertToNode,
}
export type DefaultNodeConversionProvider = typeof DEFAULT_NODE_CONVERSORS
