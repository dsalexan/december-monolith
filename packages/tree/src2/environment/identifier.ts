import assert from "assert"
import { Primitive } from "type-fest"
import { AnyObject } from "tsdef"

import Node from "../node"

import type Environment from "."
import { Simbol, SymbolKey } from "."

import type { SourceEntry } from "./source/entry"

export class BaseIdentifier {
  type: string

  constructor(type: string) {
    this.type = type
  }

  toSymbol(): Simbol {
    throw new Error(`Method not implemented`)
  }
}

export class NamedIdentifier extends BaseIdentifier {
  name: string

  constructor(name: string) {
    super(`named`)
    this.name = name
  }

  toSymbol(): Simbol {
    return new Simbol(this.name)
  }
}

export type Identifier = NamedIdentifier

export const NON_RESOLVED_VALUE = Symbol(`environment:identifier:non-resolved-value`)
export const MISSING_VALUE = Symbol(`environment:identifier:missing-value`)

export type NonResolvedValue = typeof NON_RESOLVED_VALUE
export type MissingValue = typeof MISSING_VALUE
export type MetaValue = NonResolvedValue | MissingValue

export type IdentifiedDataContext = Primitive | AnyObject | null

export interface IdentifiedDataValueGetterOptions {
  symbol?: Simbol
  node?: Node
}
export interface IdentifiedDataValueInvokerOptions extends IdentifiedDataValueGetterOptions {
  environment: Environment
}
export type IdentifiedDataValueInvoker<TValue, TContext extends IdentifiedDataContext = null> = (context: TContext, options: IdentifiedDataValueInvokerOptions) => TValue | MetaValue

/** Returns if a value is an  IdentifiedDataValueInvoker*/
export function isIdentifiedDataValueInvoker<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext>(value: unknown): value is IdentifiedDataValueInvoker<TValue, TContext> {
  return typeof value === `function`
}

export class IdentifiedData<TValue = unknown, TContext extends IdentifiedDataContext = null> {
  public entry: SourceEntry<TValue, TContext>
  public identifier: Identifier
  private invoker: IdentifiedDataValueInvoker<TValue, TContext>
  //
  private environment: Environment

  constructor(identifier: Identifier, entry: SourceEntry<TValue, TContext>, environment: Environment) {
    this.identifier = identifier
    this.entry = entry
    this.environment = environment
  }

  /** Sets invoker for value */
  public setInvoker(invoker: IdentifiedDataValueInvoker<TValue, TContext>) {
    assert(!this.invoker, `Invoker already set`)

    this.invoker = invoker
  }

  /** Invoke value for identified data */
  public getValue(context: TContext, options: IdentifiedDataValueGetterOptions = {}): TValue | MetaValue {
    assert(this.invoker, `Invoker not set`)

    const fullOptions: IdentifiedDataValueInvokerOptions = {
      environment: this.environment,
      ...options,
    }

    return this.invoker(context, fullOptions)
  }

  /** Checks is value invoked is resolved */
  public isResolved(value: TValue | MetaValue): value is TValue | MissingValue {
    return IdentifiedData.isResolved<TValue>(value)
  }

  /** Checks is value invoked is resolved */
  public static isResolved<TValue>(value: TValue | MetaValue): value is TValue | MissingValue {
    return value !== NON_RESOLVED_VALUE
  }
}

// export type IdentifiedDataValue<TValue = any> = TValue | typeof NON_RESOLVED_VALUE
// export type StrictIdentifiedDataValue<TValue = any> = TValue

// export type IdentifiedDataValueGetter<TValue = any> = (environment: Environment, data: unknown) => IdentifiedDataValue<TValue>
// export type StrictIdentifiedDataValueGetter<TValue = any> = (environment: Environment, data: unknown) => StrictIdentifiedDataValue<TValue>

// export interface IdentifiedData<TValue = any> {
//   name: string
//   getValue: IdentifiedDataValueGetter<TValue>
// }

// export function isDataValueResolved<TValue = any>(value: IdentifiedDataValue<TValue> | typeof MISSING_VALUE): value is StrictIdentifiedDataValue<TValue> {
//   return value !== NON_RESOLVED_VALUE
// }
