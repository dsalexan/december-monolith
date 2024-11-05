import type Environment from "."
import Node from "../node"

export class BaseIdentifier {
  type: string

  constructor(type: string) {
    this.type = type
  }
}

export class NamedIdentifier extends BaseIdentifier {
  name: string

  constructor(name: string) {
    super(`named`)
    this.name = name
  }
}

export type Identifier = NamedIdentifier

export interface IdentifiedValue<TValue = any> {
  name: string
  getValue: (this: Environment, data: unknown, node: Node) => TValue | typeof NON_RESOLVED_VALUE
}

export const NON_RESOLVED_VALUE = Symbol(`environment:identifier:non-resolved-value`)
export const MISSING_VALUE = Symbol(`environment:identifier:missing-value`)

export type IdentifiedValueReturn<TValue = any> = ReturnType<IdentifiedValue<TValue>[`getValue`]>
export type StrictIdentifiedValueReturn<TValue = any> = Exclude<IdentifiedValueReturn<TValue>, typeof NON_RESOLVED_VALUE>

export function isResolved<TValue = any>(value: IdentifiedValueReturn<TValue> | typeof MISSING_VALUE): value is StrictIdentifiedValueReturn<TValue> {
  return value !== NON_RESOLVED_VALUE
}
