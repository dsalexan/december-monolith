import assert from "assert"
import { AnyObject, Nullable } from "tsdef"
import { has, get } from "lodash"

import { RuntimeValue } from "./base"

export class ObjectValue<TObject extends AnyObject> extends RuntimeValue<TObject> {
  type: `object` = `object`

  _numberValue: Nullable<number> = null
  _stringValue: Nullable<string> = null
  _booleanValue: Nullable<boolean> = null

  _isEquals: Nullable<(other: unknown) => boolean> = null

  constructor(value: TObject, { numberValue, stringValue, booleanValue, isEquals }: { numberValue?: number; stringValue?: string; booleanValue?: boolean; isEquals?: (other: unknown) => boolean } = {}) {
    super(value)
    assert(typeof value === `object`)

    assert(numberValue === undefined || typeof numberValue === `number`, `Number Value must be a number.`)
    assert(stringValue === undefined || typeof stringValue === `string`, `String Value must be a string.`)
    assert(booleanValue === undefined || typeof booleanValue === `boolean`, `Boolean Value must be a boolean.`)

    this._numberValue = numberValue ?? null
    this._stringValue = stringValue ?? null
    this._booleanValue = booleanValue ?? null

    this._isEquals = isEquals ?? null
  }

  public static isObjectValue<TObject extends AnyObject>(value: any): value is ObjectValue<TObject> {
    return value.type === `object`
  }

  public isEmptyObject(): boolean {
    return Object.keys(this.value).length === 0
  }

  public isArray(): boolean {
    return Array.isArray(this.value)
  }

  public override isEquals(value: RuntimeValue<any>) {
    if (!this.isSameType(value)) return false
    if (this._isEquals) return this._isEquals(value.value)
    return super.isEquals(value)
  }

  public override hasNumericRepresentation(): boolean {
    return this._numberValue !== null
  }

  public override hasStringRepresentation(): boolean {
    return this._stringValue !== null
  }

  public override hasBooleanRepresentation(): boolean {
    return this._booleanValue !== null
  }

  public override asNumber(): number {
    assert(this._numberValue !== null, `Object Value has no number value.`)
    return this._numberValue
  }

  public asString(): string {
    assert(this._stringValue !== null, `Object Value has no string value.`)
    return this._stringValue
  }

  public override asBoolean(): boolean {
    assert(this._booleanValue !== null, `Object Value has no boolean value.`)
    return this._booleanValue
  }

  /** Checks if property exists in object */
  public hasProperty(propertyName: string | number): boolean {
    // if (ObjectFacade.isObjectFacade(this.value)) return this.value.hasProperty(propertyName)
    return has(this.value, propertyName)
  }

  /** Retuns property value from object */
  public getProperty<TValue = unknown>(propertyName: string | number): TValue {
    // if (ObjectFacade.isObjectFacade(this.value)) return this.value.getProperty(propertyName) as TValue
    return get(this.value, propertyName) as TValue
  }
}
