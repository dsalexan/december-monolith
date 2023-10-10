import { isNil } from "lodash"

export function get<TValue = any>(key: string): TValue | undefined
export function get<TValue = any>(key: string, defaultValue: TValue): TValue
export function get<TValue = any>(key: string, defaultValue?: TValue) {
  const value = localStorage.getItem(key)
  if (isNil(value)) return defaultValue
  return JSON.parse(value) as TValue
}

export function set(key: string, value: any) {
  const stringifiedValue = JSON.stringify(value)
  localStorage.setItem(key, stringifiedValue)
}
