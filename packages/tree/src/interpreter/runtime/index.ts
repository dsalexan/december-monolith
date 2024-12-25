import assert from "assert"
import { MaybeUndefined, Nullable } from "tsdef"

import { isQuantity, isUnit, IUnit, Quantity } from "@december/utils/unit"

import { Expression, ExpressionStatement, Node, Statement } from "../../tree"
import type Interpreter from ".."
import { RuntimeEvaluation } from "./evaluation"
import { VariableName } from ".."

export const RUNTIME_VALUE_TYPES = [`undefined`, `boolean`, `number`, `string`, `function`, `variable`, `unit`, `quantity`] as const
export type RuntimeValueType = (typeof RUNTIME_VALUE_TYPES)[number]

export { RuntimeEvaluation } from "./evaluation"
export type { ResolvedRuntimeEvaluation } from "./evaluation"

export class RuntimeValue<TValue> {
  __runtimeValue: true = true as const
  type: RuntimeValueType
  value: TValue

  constructor(value: TValue) {
    this.value = value
  }

  public static isRuntimeValue(value: any): value is RuntimeValue<any> {
    return value?.__runtimeValue === true
  }

  public getEvaluation(node: Node) {
    return new RuntimeEvaluation(this, node)
  }

  public getContent() {
    return String(this.value)
  }

  public toString() {
    return `<${this.type}> ${this.getContent()}`
  }
}

// #region IMPLEMENTATIONS

export class UndefinedValue extends RuntimeValue<undefined> {
  type: `undefined` = `undefined`

  constructor(value: undefined) {
    super(value)
    assert(value === undefined)
  }

  public static isUndefinedValue(value: any): value is UndefinedValue {
    return value.type === `undefined`
  }

  public override getContent() {
    throw new Error(`Cannot get content of undefined value.`)
    return `undefined`
  }
}

export class BooleanValue extends RuntimeValue<boolean> {
  type: `boolean` = `boolean`

  constructor(value: boolean) {
    super(value)
    assert(typeof value === `boolean`)
  }

  public static isBooleanValue(value: any): value is BooleanValue {
    return value.type === `boolean`
  }
}

export class NumericValue extends RuntimeValue<number> {
  type: `number` = `number`

  constructor(value: number) {
    super(value)
    assert(typeof value === `number`)
  }

  public static isNumericValue(value: any): value is NumericValue {
    return value.type === `number`
  }
}

export class StringValue extends RuntimeValue<string> {
  type: `string` = `string`

  constructor(value: string) {
    super(value)
    assert(typeof value === `string`)
  }

  public static isStringValue(value: any): value is StringValue {
    return value.type === `string`
  }
}

export class FunctionValue<TFunction extends Function = Function> extends RuntimeValue<TFunction> {
  type: `function` = `function`
  name: string

  constructor(fn: TFunction, name: string) {
    super(fn)
    this.name = name

    assert(typeof fn === `function`, `Function implementation must be a function.`)
    assert(typeof name === `string`, `Function Name must be a string.`)
  }

  public static isFunctionValue(value: any): value is FunctionValue {
    return value.type === `function`
  }

  public override getContent() {
    debugger
    return `${this.name}`
  }
}

export class VariableValue extends RuntimeValue<VariableName> {
  type: `variable` = `variable`

  constructor(variableName: VariableName) {
    super(variableName)
    assert(typeof variableName === `string`, `Variable Name must be a string.`)
  }

  public static isVariableValue(value: any): value is VariableValue {
    return value.type === `variable`
  }
}

export class UnitValue extends RuntimeValue<IUnit> {
  type: `unit` = `unit`

  constructor(unit: IUnit) {
    super(unit)
    assert(isUnit(unit), `Unit must be a valid unit.`)
  }

  public static isUnitValue(value: any): value is UnitValue {
    return value.type === `unit`
  }

  public override getContent() {
    return this.value.symbol
  }
}

export class QuantityValue extends RuntimeValue<Quantity> {
  type: `quantity` = `quantity`

  constructor(quantity: Quantity) {
    super(quantity)
    assert(isQuantity(quantity), `Quantity must be a valid quantity.`)
  }

  public static isQuantityValue(value: any): value is QuantityValue {
    return value.type === `quantity`
  }

  public override getContent() {
    return this.value.toString()
  }
}

// #endregion
