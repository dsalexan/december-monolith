import { IdentifiedDataContext, IdentifiedDataValueInvoker, Identifier, isIdentifiedDataValueInvoker } from "../identifier"

export interface BaseValue {
  type: string
  value: unknown
}

/** Returns if a value is a BaseValue */
export function isBaseValue(value: unknown): value is BaseValue {
  return typeof value === `object` && value !== null && `type` in value && `value` in value
}

export interface SimpleValue<TValue> extends BaseValue {
  type: `simple`
  value: TValue
}

/** Returns if a value is a SimpleValue */
export function isSimpleValue<TValue>(value: unknown): value is SimpleValue<TValue> {
  return isBaseValue(value) && value.type === `simple`
}

export interface FunctionValue<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> extends BaseValue {
  type: `function`
  value: IdentifiedDataValueInvoker<TValue, TContext>
}

/** Returns if a value is a FunctionValue */
export function isFunctionValue<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext>(value: unknown): value is FunctionValue<TValue, TContext> {
  return isBaseValue(value) && value.type === `function` && isIdentifiedDataValueInvoker(value.value)
}

export interface ProxyValue extends BaseValue {
  type: `proxy`
  value: Identifier[`name`]
}

/** Returns if a value is a ProxyValue */
export function isProxyValue(value: unknown): value is ProxyValue {
  return isBaseValue(value) && value.type === `proxy` && typeof value.value === `string`
}

export type SourcedValue<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> = SimpleValue<TValue> | FunctionValue<TValue, TContext> | ProxyValue

/** Returns if a value is a SourceValue (i.e. a value that is eligible to be set to a source) */
export function isSourcedValue<TValue>(value: unknown): value is SourcedValue<TValue> {
  return isSimpleValue(value) || isFunctionValue(value) || isProxyValue(value)
}
