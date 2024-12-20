import assert from "assert"
import { MaybeUndefined, Nullable } from "tsdef"

import { isQuantity, isUnit, IUnit, Quantity } from "@december/utils/unit"
import { Node } from "../../tree"
import type Interpreter from ".."

export const RUNTIME_VALUE_TYPES = [`undefined`, `boolean`, `number`, `string`, `function`, `identifier`, `unit`, `quantity`] as const
export type RuntimeValueType = (typeof RUNTIME_VALUE_TYPES)[number]

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
}

export interface ResolvedRuntimeEvaluation<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> {
  runtimeValue: TRuntimeValue
  node: Node
}

export class RuntimeEvaluation<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> {
  __runtimeEvaluation: true = true as const
  runtimeValue: Nullable<TRuntimeValue> = null
  node: Node

  public static isResolved<TRuntimeValue extends RuntimeValue<any>>(evaluation: RuntimeEvaluation<TRuntimeValue>): evaluation is RuntimeEvaluation<TRuntimeValue> & ResolvedRuntimeEvaluation<TRuntimeValue> {
    return RuntimeEvaluation.isRuntimeEvaluation(evaluation) && evaluation.runtimeValue !== null
  }

  public static isRuntimeEvaluation<TRuntimeValue extends RuntimeValue<any>>(evaluation: any): evaluation is RuntimeEvaluation<TRuntimeValue> {
    return evaluation?.__runtimeEvaluation === true
  }

  constructor(node: Node)
  constructor(runtimeValue: TRuntimeValue, node: Node)
  constructor(runtimeValue: TRuntimeValue | Node, node?: Node) {
    if (RuntimeValue.isRuntimeValue(runtimeValue)) {
      this.runtimeValue = runtimeValue
      this.node = node as Node
    } else {
      this.runtimeValue = null as any
      this.node = runtimeValue as Node
    }
  }

  public toNode<TNode extends Node = Node>(i: Interpreter): TNode {
    // 1. If value is resolved, just pack data into node (since it could be different than original node)
    if (RuntimeEvaluation.isResolved(this)) return i.evaluator.convertToNode(i, this.runtimeValue)

    // 2. If value was never resolved, just send original node back
    return this.node as TNode
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
}

export class IdentifierValue extends RuntimeValue<string> {
  type: `identifier` = `identifier`

  constructor(variableName: string) {
    super(variableName)
    assert(typeof variableName === `string`, `Variable Name must be a string.`)
  }

  public static isIdentifierValue(value: any): value is IdentifierValue {
    return value.type === `identifier`
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
}

// #endregion
