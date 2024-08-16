import assert from "assert"

import { matchValue, ValuePattern, ValuePatternTypes } from "./value"

export * as Value from "./value"

export type Pattern = ValuePattern

export function match(value: unknown, pattern: Pattern): boolean {
  if (ValuePatternTypes.includes(pattern.type)) return matchValue(value, pattern as ValuePattern)

  assert(false, `Invalid pattern type`)
}
