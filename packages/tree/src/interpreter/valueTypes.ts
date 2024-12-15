import { IUnit, Quantity } from "@december/utils/unit"

import { ArtificialToken } from "../token/core"
import { getTokenKind } from "../token/kind"
import { BinaryExpression, BooleanLiteral, Expression, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../tree"
import assert from "assert"
import { isNumber } from "lodash"
import { AnyObject } from "tsdef"

export const VALUE_TYPES = [`boolean`, `number`, `string`, `function`, `identifier`, `unit`, `quantity`] as const
export type ValueType = (typeof VALUE_TYPES)[number]

export interface RuntimeValue<TValue, TNode extends Node = Node> {
  type: string
  value: TValue
  node: TNode
}

export interface BooleanValue<TNode extends Node = Node> extends RuntimeValue<boolean, TNode> {
  type: `boolean`
}

export interface NumericValue<TNode extends Node = Node> extends RuntimeValue<number, TNode> {
  type: `number`
}

export interface StringValue<TNode extends Node = Node> extends RuntimeValue<string, TNode> {
  type: `string`
}

export interface FunctionValue<TNode extends Node = Node> extends RuntimeValue<Function, TNode> {
  type: `function`
  name: string
}

export interface IdentifierValue<TNode extends Node = Node> extends RuntimeValue<string, TNode> {
  type: `identifier`
}

export interface UnitValue<TNode extends Node = Node> extends RuntimeValue<IUnit, TNode> {
  type: `unit`
}

export interface QuantityValue<TNode extends Node = Node> extends RuntimeValue<Quantity, TNode> {
  type: `quantity`
}

// #region GUARDS

export function isBooleanValue(value: AnyObject): value is BooleanValue {
  return `type` in value && value.type === `boolean`
}

export function isNumericValue(value: AnyObject): value is NumericValue {
  return `type` in value && value.type === `number`
}

export function isStringValue(value: AnyObject): value is StringValue {
  return `type` in value && value.type === `string`
}

export function isFunctionValue(value: AnyObject): value is FunctionValue {
  return `type` in value && value.type === `function`
}

export function isIdentifierValue(value: AnyObject): value is IdentifierValue {
  return `type` in value && value.type === `identifier`
}

export function isUnitValue(value: AnyObject): value is UnitValue {
  return `type` in value && value.type === `unit`
}

export function isQuantityValue(value: AnyObject): value is QuantityValue {
  return `type` in value && value.type === `quantity`
}

// #endregion

// #region FACTORY

export function createBooleanValue(value: boolean, node: Node): BooleanValue {
  return { type: `boolean`, value, node }
}

export function createNumericValue(value: number, node: Node): NumericValue {
  return { type: `number`, value, node }
}

export function createStringValue(value: string, node: Node): StringValue {
  return { type: `string`, value, node }
}

export function createFunctionValue(value: Function, name: string, node: Node): FunctionValue {
  return { type: `function`, value, name, node }
}

export function createIdentifierValue(value: string, node: Node): IdentifierValue {
  return { type: `identifier`, value, node }
}

export function createUnitValue(value: IUnit, node: Node): UnitValue {
  return { type: `unit`, value, node }
}

export function createQuantityValue(value: Quantity, node: Node): QuantityValue {
  return { type: `quantity`, value, node }
}

// #endregion
