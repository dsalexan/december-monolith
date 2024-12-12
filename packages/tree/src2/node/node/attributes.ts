import { isArray, mergeWith } from "lodash"

import { mergeWithDeep } from "@december/utils"
import { IUnit, Quantity } from "@december/utils/unit"
import { isPrimitive } from "@december/utils/typing"

import { Node } from "./base"

export interface SemanticalAttributes {
  clonedFrom?: Node[`id`]
  originalNodes?: Node[]
  tags: string[]
  reorganized?: boolean
  group?: string
  unbalanced?: boolean
  // QUANTITY
  unit?: IUnit
  clarityWrapper?: boolean
}

export type Attributes = SemanticalAttributes

export function createAttributes(): Attributes {
  return {
    tags: [],
  }
}

export function setAttributes(this: Node, attributes: Partial<Attributes>) {
  const newAttributes = mergeWithDeep(this._attributes, attributes, (currentValue, newValue) => {
    debugger
  })

  this._attributes = newAttributes

  return this
}
