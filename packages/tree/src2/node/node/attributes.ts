import { isArray, mergeWith } from "lodash"

import { mergeWithDeep } from "@december/utils"
import { isPrimitive } from "@december/utils/typing"

import { Node } from "./base"
import { NRSMutationMap } from "../../nrs/system"

export interface SemanticalAttributes {
  originalNodes?: Node[]
  tags: string[]
  reorganized?: boolean
  group?: string
  mutations?: Record<string, NRSMutationMap> // tag -> mutation map per ruleset
  unbalanced?: boolean
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
