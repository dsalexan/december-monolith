import { isArray, isBoolean, isFunction, isNumber, isObjectLike, isString, isSymbol } from "lodash"
import { VariableType } from "./types"

// export type VariableType = `string` | `number` | `bigint` | `boolean` | `symbol` | `undefined` | `object` | `function`

export function isType(value: unknown, type: VariableType) {
  if (type === `string`) return isString(value)
  else if (type === `number`) return isNumber(value)
  else if (type === `boolean`) return isBoolean(value)
  else if (type === `function`) return isFunction(value)
  else if (type === `array`) return isArray(value)
  else if (type === `object`) return isObjectLike(value)

  // ERROR: Unimplemented
  debugger
}

export function getType(value: unknown): VariableType | undefined {
  if (isSymbol(value)) return `symbol`
  else if (isString(value)) return `string`
  else if (isNumber(value)) return `number`
  else if (isBoolean(value)) return `boolean`
  else if (isFunction(value)) return `function`
  else if (isArray(value)) return `array`
  else if (isObjectLike(value)) return `object`
  else if (value === undefined) return `undefined`
  else if (value === null) return `null`

  // ERROR: Unimplemented
  return undefined
}

export function guessType(value: unknown): VariableType | undefined {
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
