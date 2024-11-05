import { Primitive } from "type-fest"
import { BaseIdentifier, IdentifiedValue, Identifier } from "../identifier"
import BaseSource from "./base"

export interface BaseValue {
  type: string
}

export interface SimpleValue extends BaseValue {
  type: `simple`
  value: unknown
}

export interface FunctionValue extends BaseValue {
  type: `function`
  value: IdentifiedValue[`getValue`]
}

export type SourcedValue = SimpleValue | FunctionValue

export function isSourcedValue(value: unknown): value is SourcedValue {
  return typeof value === `object` && value !== null && `type` in value && (`value` in value || `getValue` in value)
}

export type InputObjectSourceData = Record<string, null | Primitive | SourcedValue>
export type ObjectSourceData = Record<string, SourcedValue>

export default class ObjectSource extends BaseSource {
  declare type: `object`

  object: ObjectSourceData = {}

  constructor(name: string) {
    super(`object`, name)
  }

  public _has(identifier: Identifier): boolean {
    if (identifier.type === `named`) return this.object[identifier.name] !== undefined

    throw new Error(`Invalid identifier type "${identifier.type}" for object source checker`)
  }

  public _get(identifier: Identifier): IdentifiedValue {
    if (identifier.type === `named`) {
      const value = this.object[identifier.name]

      if (value.type === `simple`) return { name: identifier.name, getValue: () => value.value }
      else if (value.type === `function`) return { name: identifier.name, getValue: value.value }

      // @ts-ignore
      throw new Error(`Invalid value type "${value.type}" for object source`)
    }

    throw new Error(`Invalid identifier type "${identifier.type}" for object source getter`)
  }
}
