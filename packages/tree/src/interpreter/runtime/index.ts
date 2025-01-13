import assert from "assert"
import { AnyFunction, AnyObject, Arguments, MaybeUndefined, Nullable } from "tsdef"

import { isQuantity, isUnit, IUnit, Quantity } from "@december/utils/unit"

import { Expression, ExpressionStatement, Node, Statement } from "../../tree"
import { RuntimeEvaluation } from "./evaluation"
import type Interpreter from ".."
import { ObjectValue, type Environment, type VariableName } from ".."
import { ArtificialToken, Token } from "../../token/core"
import { getTokenKind } from "../../token"
import { get, has } from "lodash"
import { RuntimeValue } from "./base"

export { RuntimeValue } from "./base"
export { RuntimeEvaluation } from "./evaluation"
export type { ResolvedRuntimeEvaluation } from "./evaluation"
export { ObjectValue } from "./object"

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

  public override hasBooleanRepresentation(): boolean {
    return true
  }

  public override asBoolean(): boolean {
    return this.value
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

  public toToken(): Token {
    return new ArtificialToken(getTokenKind(`number`), String(this.asNumber()))
  }
}

export class StringValue<TString extends string = string> extends RuntimeValue<TString> {
  type: `string` = `string`

  constructor(value: TString) {
    super(value)
    assert(typeof value === `string`)
  }

  public static isStringValue<TString extends string = string>(value: any): value is StringValue<TString> {
    return value.type === `string`
  }

  public toToken(): Token {
    return new ArtificialToken(getTokenKind(`string`), this.value.toString())
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

export class PropertyValue extends RuntimeValue<{ objectVariableName; propertyName }> {
  type: `property` = `property`
  public objectVariableName: VariableName
  public propertyName: string

  constructor(objectVariableName: VariableName, propertyName: string) {
    super({ objectVariableName, propertyName })

    assert(typeof objectVariableName === `string`, `Object Variable Name must be a string.`)
    assert(typeof propertyName === `string`, `Property Name must be a string.`)
  }

  public static isPropertyValue(value: any): value is PropertyValue {
    return value.type === `property`
  }

  public override toToken(): Token {
    return new ArtificialToken(getTokenKind(`string`), `${this.objectVariableName}::${this.propertyName}`)
  }
}

export class ExpressionValue extends RuntimeValue<Expression> {
  type: `expression` = `expression`

  constructor(expression: Expression) {
    super(expression)
    assert(expression instanceof Expression, `Expression must be a valid expression.`)
  }

  public static isExpressionValue(value: any): value is ExpressionValue {
    return value.type === `expression`
  }

  public getContent() {
    return this.value.getContent()
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

export function makeRuntimeValue<TDict extends AnyObject = AnyObject>(value: unknown): NumericValue | ObjectValue<TDict> {
  if (RuntimeValue.isRuntimeValue(value)) {
    if (NumericValue.isNumericValue(value)) return value
    if (ObjectValue.isObjectValue(value)) return value as ObjectValue<TDict>

    throw new Error(`Unsupported value type.`)
  }

  if (typeof value === `number`) return new NumericValue(value)
  if (typeof value === `object`) return new ObjectValue(value as TDict)

  throw new Error(`Unsupported value type.`)
}
