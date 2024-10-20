import assert from "assert"

export { PropertyReferencePattern, ReferencePattern, isReferencePattern, REFERENCE, PROPERTY, SELF_PROPERTY, PLACEHOLDER_SELF_REFERENCE } from "./match"

export class Reference<TType extends string = string, TValue = string> {
  type: TType
  value: TValue

  constructor(type: TType, value: TValue) {
    this.type = type
    this.value = value
  }

  toString() {
    return `${this.type}:${this.value}`
  }

  isEqual(other: Reference) {
    return this.toString() === other.toString()
  }
}

export type StringProperty = string
export type RegexProperty = RegExp

export const ANY_PROPERTY = Symbol.for(`ANY_PROPERTY`)
export const METADATA_PROPERTY = Symbol.for(`METADATA_PROPERTY`)
export type SymbolProperty = typeof ANY_PROPERTY | typeof METADATA_PROPERTY
// TODO: Add support for REGEX

export type Property = StringProperty | SymbolProperty | RegexProperty

export class PropertyReference<TReference extends Reference = Reference, TProperty extends Property = Property> {
  object: TReference
  property: TProperty

  constructor(type: TReference[`type`], value: TReference[`value`], property: TProperty)
  constructor(object: TReference, property: TProperty)
  constructor(typeOrObject: TReference | TReference[`type`], valueOrProperty: TProperty | TReference[`value`], property?: TProperty) {
    if (typeof typeOrObject === `object`) {
      this.object = typeOrObject
      this.property = valueOrProperty as TProperty
    } else {
      assert(property !== undefined, `Property must be defined`)

      this.object = new Reference(typeOrObject, valueOrProperty as string) as TReference
      this.property = property
    }
  }

  toString() {
    return PropertyReference.toString(this.object, this.property)
  }

  static toString<TReference extends Reference = Reference, TProperty extends Property = Property>(object: TReference, property: TProperty) {
    let _property = property.toString()
    if (property === ANY_PROPERTY) _property = `*`

    return `${object.toString()}:${_property}`
  }

  isEqual(other: PropertyReference) {
    // If either property is "any", return true
    if (other.property === ANY_PROPERTY || this.property === ANY_PROPERTY) return this.object.isEqual(other.object)

    // ERROR: Untested
    if (other.property === METADATA_PROPERTY || this.property === METADATA_PROPERTY) debugger

    return this.toString() === other.toString()
  }
}
