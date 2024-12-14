import { IUnit, Quantity } from "@december/utils/unit"

import { ArtificialToken } from "../token/core"
import { getTokenKind } from "../token/kind"
import { BinaryExpression, BooleanLiteral, Expression, NumericLiteral, StringLiteral, UnitLiteral } from "../tree"
import assert from "assert"
import { isNumber } from "lodash"

export const VALUE_TYPES = [`boolean`, `number`, `string`, `function`, `identifier`, `unit`, `quantity`] as const
export type ValueType = (typeof VALUE_TYPES)[number]

export interface RuntimeValue<TValue> {
  type: string
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
  content: string
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
