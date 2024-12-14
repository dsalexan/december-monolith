import { IUnit, Quantity } from "@december/utils/unit"

import { ArtificialToken } from "../token/core"
import { getTokenKind } from "../token/kind"
import { BinaryExpression, BooleanLiteral, Expression, NumericLiteral, StringLiteral, UnitLiteral } from "../tree"
import assert from "assert"
import { isNumber } from "lodash"

export const VALUE_TYPES = [`boolean`, `number`, `string`, `function`, `identifier`, `unit`, `quantity`] as const
export type ValueType = (typeof VALUE_TYPES)[number]

export interface RuntimeValue<TValue> {
  type: ValueType
  value: TValue
}

export interface BooleanValue extends RuntimeValue<boolean> {
  type: `boolean`
}

export interface NumericValue extends RuntimeValue<number> {
  type: `number`
}

export interface StringValue extends RuntimeValue<string> {
  type: `string`
}

export interface FunctionValue extends RuntimeValue<Function> {
  type: `function`
  name: string
}

export interface IdentifierValue extends RuntimeValue<string> {
  type: `identifier`
}

export interface UnitValue extends RuntimeValue<IUnit> {
  type: `unit`
}

export interface QuantityValue extends RuntimeValue<Quantity> {
  type: `quantity`
}

// #region GUARDS

export function isBooleanValue(value: RuntimeValue<any>): value is BooleanValue {
  return value.type === `boolean`
}

export function isNumericValue(value: RuntimeValue<any>): value is NumericValue {
  return value.type === `number`
}

export function isStringValue(value: RuntimeValue<any>): value is StringValue {
  return value.type === `string`
}

export function isFunctionValue(value: RuntimeValue<any>): value is FunctionValue {
  return value.type === `function`
}

export function isIdentifierValue(value: RuntimeValue<any>): value is IdentifierValue {
  return value.type === `identifier`
}

export function isUnitValue(value: RuntimeValue<any>): value is UnitValue {
  return value.type === `unit`
}

export function isQuantityValue(value: RuntimeValue<any>): value is QuantityValue {
  return value.type === `quantity`
}

// #endregion

// #region FACTORY

export function parseRuntimeValueToExpression(value: BooleanValue): BooleanLiteral
export function parseRuntimeValueToExpression(value: NumericValue): NumericLiteral
export function parseRuntimeValueToExpression(value: StringValue): StringLiteral
export function parseRuntimeValueToExpression(value: RuntimeValue<any>): Expression
export function parseRuntimeValueToExpression(value: RuntimeValue<any>): Expression {
  if (isBooleanValue(value)) return new BooleanLiteral(value.value)
  if (isNumericValue(value)) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), String(value.value)))
  if (isStringValue(value)) return new StringLiteral(new ArtificialToken(getTokenKind(`string`), value.value))
  if (isUnitValue(value)) return new UnitLiteral(value.value, new ArtificialToken(getTokenKind(`string`), value.value.getSymbol()))
  if (isQuantityValue(value)) {
    assert(isNumber(value.value.value), `Quantity value must be a number.`)
    const numericLeft = parseRuntimeValueToExpression({ type: `number`, value: value.value.value })
    const unitRight = parseRuntimeValueToExpression({ type: `unit`, value: value.value.unit })

    return new BinaryExpression(numericLeft, new ArtificialToken(getTokenKind(`asterisk`), `*`), unitRight)
  }

  throw new Error(`Cannot parse runtime value to expression string: ${value.type}`)
}

// #endregion
