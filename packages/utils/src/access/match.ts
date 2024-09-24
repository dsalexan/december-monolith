import { BasePattern, BasePatternOptions } from "@december/utils/match/base"
import { ElementPattern, EQUALS } from "@december/utils/match/element"
import { SetPattern } from "@december/utils/match/set"

import { ANY_PROPERTY, Property, PropertyReference, Reference, SymbolProperty } from "."
import { isString, property } from "lodash"
import assert from "assert"

export interface ReferencePatternOptions extends BasePatternOptions {}

export class ReferencePattern<TReference extends Reference = Reference> extends BasePattern {
  declare type: `reference`

  typePattern: BasePattern
  valuePattern: BasePattern

  constructor(typePattern: BasePattern | TReference[`type`], valuePattern: BasePattern | TReference[`value`], options: Partial<ReferencePatternOptions> = {}) {
    super(`reference`, options)

    this.typePattern = isString(typePattern) ? EQUALS(typePattern) : typePattern
    this.valuePattern = isString(valuePattern) ? EQUALS(valuePattern) : valuePattern
  }

  override _match(reference: Reference): boolean {
    const typeMatch = this.typePattern.match(reference.type)
    const valueMatch = this.valuePattern.match(reference.value)

    return typeMatch && valueMatch
  }

  override _toString() {
    return `(${this.typePattern.toString()}, ${this.valuePattern.toString()})`
  }
}

export interface PropertyReferencePatternOptions extends BasePatternOptions {}

export const PLACEHOLDER_SELF_REFERENCE = Symbol.for(`PLACEHOLDER_SELF_REFERENCE`)

export class PropertyReferencePattern<TReference extends Reference = Reference> extends BasePattern {
  declare type: `property`

  referencePattern: ReferencePattern<TReference> | typeof PLACEHOLDER_SELF_REFERENCE
  propertyPattern: ElementPattern<string> | SymbolProperty

  constructor(referencePattern: ReferencePattern<TReference> | TReference | typeof PLACEHOLDER_SELF_REFERENCE, propertyPattern: ElementPattern<string> | Property, options: Partial<PropertyReferencePatternOptions> = {}) {
    super(`property`, options)

    this.referencePattern = referencePattern instanceof Reference ? new ReferencePattern(referencePattern.type, referencePattern.value) : referencePattern

    if (propertyPattern instanceof BasePattern) this.propertyPattern = propertyPattern
    else if (isString(propertyPattern)) this.propertyPattern = EQUALS(propertyPattern)
    else this.propertyPattern = propertyPattern
  }

  override _match(propertyReference: PropertyReference): boolean {
    assert(this.referencePattern !== PLACEHOLDER_SELF_REFERENCE, `PropertyReferencePattern cannot have a self reference as a reference pattern`)

    const referenceMatch = this.referencePattern.match(propertyReference.object)

    let propertyMatch = false
    if (this.propertyPattern instanceof BasePattern) propertyMatch = this.propertyPattern.match(propertyReference.property)
    else if (this.propertyPattern === ANY_PROPERTY) propertyMatch = true

    return referenceMatch && propertyMatch
  }

  override match(reference: PropertyReference): boolean {
    return super.match(reference)
  }

  override _toString() {
    if (this.referencePattern === PLACEHOLDER_SELF_REFERENCE) return `(self, ${this.propertyPattern.toString()})`
    return `(${this.referencePattern.toString()}, ${this.propertyPattern.toString()})`
  }
}

// #region Proxies

export const REFERENCE = (typePattern: BasePattern | Reference[`type`], valuePattern: BasePattern | Reference[`value`]) => new ReferencePattern(typePattern, valuePattern)
export const PROPERTY = (referencePattern: ReferencePattern | Reference | typeof PLACEHOLDER_SELF_REFERENCE, propertyPattern: ElementPattern<string> | Property) => new PropertyReferencePattern(referencePattern, propertyPattern)
export const SELF_PROPERTY = (propertyPattern: ElementPattern<string> | Property) => PROPERTY(PLACEHOLDER_SELF_REFERENCE, propertyPattern)

// #endregion

export function isReferencePattern(pattern: BasePattern): pattern is ReferencePattern | PropertyReferencePattern {
  return pattern.type === `reference` || pattern.type === `property`
}
