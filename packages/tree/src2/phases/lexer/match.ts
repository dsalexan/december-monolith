import assert from "assert"

import { UnitManager } from "@december/utils/unit"

import type Type from "../../type/base"

export interface MatchOptions {
  unitManager: UnitManager
}

export interface FalseMatchResult {
  value: false
}

export interface TrueMatchResult {
  value: true
  data?: any
}

export type MatchResult = FalseMatchResult | TrueMatchResult

export type MatchFunction = (type: Type, sequence: string, options: MatchOptions) => MatchResult

export const PatternMatchFunction: MatchFunction = (type: Type, sequence: string, options: MatchOptions) => {
  const lexical = type.lexical!
  const [pattern] = lexical.patterns

  assert(lexical.patterns.length === 1, `Unimplemented multiple patterns`)
  assert(pattern, `No pattern found for type "${type.name}"`)

  const match = pattern.match(sequence)
  return { value: match.isMatch, data: match }
  // return { value: pattern.match(sequence) }
}

export const UnitMatchFunction: MatchFunction = (type: Type, sequence: string, options: MatchOptions) => {
  const unitManager = options.unitManager

  const units = unitManager.getUnits(`any`, sequence)
  if (units.length === 0) return { value: false }

  const [unit] = units

  assert(units.length === 1, `Multiple units found for sequence "${sequence}"`)

  return { value: true, data: unit }
}
