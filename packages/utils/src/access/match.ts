import { BasePattern, BasePatternOptions } from "@december/utils/match/base"
import { ElementPattern, EQUALS } from "@december/utils/match/element"
import { SetPattern } from "@december/utils/match/set"

import { ANY_PROPERTY, Property, PropertyReference, Reference, SymbolProperty } from "."
import { isString, property } from "lodash"

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
}

export interface PropertyReferencePatternOptions extends BasePatternOptions {}

export class PropertyReferencePattern<TReference extends Reference = Reference> extends BasePattern {
  declare type: `property`

  referencePattern: ReferencePattern<TReference>
  propertyPattern: ElementPattern<string> | SymbolProperty

  constructor(referencePattern: ReferencePattern<TReference> | TReference, propertyPattern: ElementPattern<string> | Property, options: Partial<PropertyReferencePatternOptions> = {}) {
    super(`property`, options)

    this.referencePattern = referencePattern instanceof Reference ? new ReferencePattern(referencePattern.type, referencePattern.value) : referencePattern

    if (propertyPattern instanceof BasePattern) this.propertyPattern = propertyPattern
    else if (isString(propertyPattern)) this.propertyPattern = EQUALS(propertyPattern)
    else this.propertyPattern = propertyPattern
  }

  override _match(propertyReference: PropertyReference): boolean {
    const referenceMatch = this.referencePattern.match(propertyReference.object)

    let propertyMatch = false
    if (this.propertyPattern instanceof BasePattern) propertyMatch = this.propertyPattern.match(propertyReference.property)
    else if (this.propertyPattern === ANY_PROPERTY) propertyMatch = true

    return referenceMatch && propertyMatch
  }

  override match(reference: PropertyReference): boolean {
    return super.match(reference)
  }
}

// #region Proxies

export const REFERENCE = (typePattern: BasePattern | Reference[`type`], valuePattern: BasePattern | Reference[`value`]) => new ReferencePattern(typePattern, valuePattern)
export const PROPERTY = (referencePattern: ReferencePattern | Reference, propertyPattern: ElementPattern<string> | Property) => new PropertyReferencePattern(referencePattern, propertyPattern)

// #endregion

export function isReferencePattern(pattern: BasePattern): pattern is ReferencePattern | PropertyReferencePattern {
  return pattern.type === `reference` || pattern.type === `property`
}
