import { isArray, mergeWith } from "lodash"

import { isPrimitive } from "@december/utils/typing"

import { Node } from "./base"

export interface SemanticalAttributes {
  originalNodes?: Node[]
  tags: string[]
  reorganized?: boolean
  group?: string
}

export type Attributes = SemanticalAttributes

export function createAttributes(): Attributes {
  return {
    tags: [],
  }
}

export function setAttributes(this: Node, attributes: Partial<Attributes>) {
  const newAttributes = mergeWith(this._attributes, attributes, (currentValue, newValue) => {
    if (isPrimitive(newValue)) return newValue
    if (currentValue === undefined || currentValue.length === 0) return newValue
    if (currentValue.length === newValue.length) return newValue
    debugger
  })

  this._attributes = newAttributes

  return this
}
