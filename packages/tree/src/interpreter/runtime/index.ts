import assert from "assert"
import { AnyFunction, AnyObject, Arguments, MaybeUndefined, Nullable } from "tsdef"

import { isQuantity, isUnit, IUnit, Quantity } from "@december/utils/unit"

import { Expression, ExpressionStatement, Node, Statement } from "../../tree"
import { RuntimeEvaluation } from "./evaluation"
import type Interpreter from ".."
import type { Environment, VariableName } from ".."

export const RUNTIME_VALUE_TYPES = [`undefined`, `boolean`, `number`, `string`, `function`, `variable`, `unit`, `quantity`, `object`] as const
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

  public isEquals(value: RuntimeValue<any>) {
    return this.type === value.type && this.value === value.value
  }

  public hasNumericRepresentation(): boolean {
    return false
  }

  public asNumber(): number {
    throw new Error(`Unsupported operation`)
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

  public override hasNumericRepresentation(): boolean {
    return true
  }

  public override asNumber(): number {
    return this.value
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

export class FunctionValue<TFunction extends RuntimeFunction = RuntimeFunction> extends RuntimeValue<Contextualized<TFunction>> {
  type: `function` = `function`
  name: string

  constructor(fn: Contextualized<TFunction>, name: string) {
    super(fn)
    this.name = name

    assert(typeof fn === `function`, `Function implementation must be a function.`)
    assert(typeof name === `string`, `Function Name must be a string.`)
  }

  public static isFunctionValue(value: any): value is FunctionValue {
    return value.type === `function`
  }

  public override getContent() {
    return `${this.name}(...)`
  }

  public override isEquals(value: RuntimeValue<any>) {
    debugger
    // TODO: How to compare functions?
    return FunctionValue.isFunctionValue(value)
  }
}

export type RuntimeFunction = (...args: any[]) => Nullable<Node | RuntimeValue<any> | RuntimeEvaluation>
export type Contextualized<TFunction extends RuntimeFunction = RuntimeFunction> = (i: Interpreter, node: Node, environment: Environment) => TFunction

export class ObjectValue<TObject extends AnyObject> extends RuntimeValue<TObject> {
  type: `object` = `object`
  _numberValue: Nullable<number> = null
  _stringValue: Nullable<string> = null

  constructor(value: TObject, { numberValue, stringValue }: { numberValue?: number; stringValue?: string } = {}) {
    super(value)
    assert(typeof value === `object`)

    assert(numberValue === undefined || typeof numberValue === `number`, `Number Value must be a number.`)
    assert(stringValue === undefined || typeof stringValue === `string`, `String Value must be a string.`)

    this._numberValue = numberValue ?? null
    this._stringValue = stringValue ?? null
  }

  public static isObjectValue<TObject extends AnyObject>(value: any): value is ObjectValue<TObject> {
    return value.type === `object`
  }

  public isEmptyObject(): boolean {
    return Object.keys(this.value).length === 0
  }

  public override hasNumericRepresentation(): boolean {
    return this._numberValue !== null
  }

  public override asNumber(): number {
    assert(this._numberValue !== null, `Object Value has no number value.`)
    return this._numberValue
  }

  public asString(): string {
    assert(this._stringValue !== null, `Object Value has no string value.`)
    return this._stringValue
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

export function makeRuntimeValue(value: unknown): NumericValue {
  if (typeof value === `number`) return new NumericValue(value)

  throw new Error(`Unsupported value type.`)
}
