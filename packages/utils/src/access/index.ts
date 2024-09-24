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
export const ANY_PROPERTY = Symbol.for(`ANY_PROPERTY`)
export type SymbolProperty = typeof ANY_PROPERTY
// TODO: Add support for REGEX

export type Property = StringProperty | SymbolProperty

export class PropertyReference<TReference extends Reference = Reference> {
  object: TReference
  property: Property

  constructor(type: TReference[`type`], value: TReference[`value`], property: Property)
  constructor(object: TReference, property: Property)
  constructor(typeOrObject: TReference | TReference[`type`], valueOrProperty: Property | TReference[`value`], property?: Property) {
    if (typeof typeOrObject === `object`) {
      this.object = typeOrObject
      this.property = valueOrProperty
    } else {
      assert(property !== undefined, `Property must be defined`)

      this.object = new Reference(typeOrObject, valueOrProperty as string) as TReference
      this.property = property
    }
  }

  toString() {
    return PropertyReference.toString(this.object, this.property)
  }

  static toString(object: Reference, property: Property) {
    let _property = property.toString()
    if (property === ANY_PROPERTY) _property = `*`

    return `${object.toString()}:${_property}`
  }

  isEqual(other: PropertyReference) {
    // If either property is "any", return true
    if (other.property === ANY_PROPERTY || this.property === ANY_PROPERTY) return this.object.isEqual(other.object)

    return this.toString() === other.toString()
  }
}
