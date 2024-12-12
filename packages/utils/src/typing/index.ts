import { isArray, isBoolean, isFunction, isNil, isNumber, isObjectLike, isString, isSymbol } from "lodash"
import { AnyObject, MaybeUndefined } from "tsdef"
import assert from "assert"

import { VARIABLE_TYPES, PRIMITIVE_VARIABLE_TYPES, PRIMITIVE_DEFINED_VARIABLE_TYPES } from "./types"
import { VariableType, PrimitiveVariableType, PrimitiveDefinedVariableType } from "./types"

import { isQuantity } from "../unit/quantity"

export type { ITyped } from "./custom"
export { getTypes, isOfType, isTyped } from "./custom"

export { VARIABLE_TYPES, DEFINED_VARIABLE_TYPES, OBJECT_VARIABLE_TYPES, PRIMITIVE_VARIABLE_TYPES, PRIMITIVE_DEFINED_VARIABLE_TYPES } from "./types"
export type { VariableType, DefinedVariableType, ObjectVariableType, PrimitiveVariableType, PrimitiveDefinedVariableType } from "./types"
export type Primitive = string | number | boolean | symbol | null | undefined
export type Maybe<T> = T | undefined
export type Nullable<T> = T | null

export type Indexed<T> = T & { _index: number }

export function isType(value: unknown, type: VariableType): boolean {
  if (type === `string`) return isString(value)
  else if (type === `number`) return isNumber(value)
  else if (type === `boolean`) return isBoolean(value)
  else if (type === `function`) return isFunction(value)
  else if (type === `array`) return isArray(value)
  else if (type === `object`) return isObjectLike(value)

  // ERROR: Unimplemented
  debugger
  return false
}

export function getType(value: unknown): MaybeUndefined<VariableType> {
  if (isSymbol(value)) return `symbol`
  else if (isString(value)) return `string`
  else if (isNumber(value)) return `number`
  else if (isBoolean(value)) return `boolean`
  else if (isFunction(value)) return `function`
  else if (isArray(value)) return `array`
  // else if (isQuantity(value)) return `quantity`
  else if (isObjectLike(value)) return `object`
  else if (value === undefined) return `undefined`
  else if (value === null) return `null`

  // ERROR: Unimplemented
  debugger
  return undefined
}

export function asType(value: unknown, type: VariableType): Primitive {
  if (type === `string`) return String(value)
  else if (type === `number`) {
    const number = Number(value)

    assert(!isNaN(number), `Value "${value}" is not a number`)

    return number
  } else if (type === `boolean`) return isNil(value) || String(value) === `0` || String(value).toLowerCase() === `false` ? false : Boolean(value)
  else if (type === `undefined`) return undefined
  else if (type === `null`) return null

  throw new Error(`Type "${type}" not implemented`)
}

export function guessType(value: unknown): MaybeUndefined<VariableType> {
  if (!isString(value)) return getType(value)

  const trimmed = value.trim()
  if (trimmed[0] === `{` && trimmed[trimmed.length - 1] === `}`) return `object`
  if (trimmed[0] === `[` && trimmed[trimmed.length - 1] === `]`) return `array`

  // TODO: Implement function check

  if (value === `true` || value === `false`) return `boolean`

  const _number = parseFloat(value)
  if (!isNaN(_number)) return `number`

  return `string`
}

export function isPrimitive(value: unknown): value is PrimitiveVariableType {
  return isString(value) || isNumber(value) || isBoolean(value) || isSymbol(value) || isNil(value)
}

export function getDeepProperties(object: AnyObject, path = ``, skipDeep: (path: string, value: unknown) => boolean): string[] {
  if (skipDeep(path, object)) return []

  let entries = Object.entries(object)

  const paths: string[] = []
  for (const [key, value] of entries) {
    const localPath = (path !== `` ? `${path}.` : ``) + key

    paths.push(localPath)

    if (!isPrimitive(value)) paths.push(...getDeepProperties(value, localPath, skipDeep))
  }

  return paths
}
