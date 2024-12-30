import assert from "assert"
import { AnyObject, Nullable } from "tsdef"
import { has, get } from "lodash"

import { RuntimeValue } from "./base"

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

  public isArray(): boolean {
    return Array.isArray(this.value)
  }

  public override hasNumericRepresentation(): boolean {
    return this._numberValue !== null
  }

  public override hasStringRepresentation(): boolean {
    return this._stringValue !== null
  }

  public override asNumber(): number {
    assert(this._numberValue !== null, `Object Value has no number value.`)
    return this._numberValue
  }

  public asString(): string {
    assert(this._stringValue !== null, `Object Value has no string value.`)
    return this._stringValue
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
