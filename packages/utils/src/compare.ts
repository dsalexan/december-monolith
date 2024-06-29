import { isArray, isEqual } from "lodash"

export const PrimitiveComparisonOperations = [`equal`, `not_equal`, `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`] as const
export type PrimitiveComparisonOperation = (typeof PrimitiveComparisonOperations)[number]

export const ArrayComparisonOperations = [`equal`, `not_equal`, `intersects`, `contains`, `contained_by`] as const
export type ArrayComparisonOperation = (typeof ArrayComparisonOperations)[number]

export const OneToOneComparisonOperations = [...PrimitiveComparisonOperations, ...ArrayComparisonOperations] as const
export type OneToOneComparisonOperation = PrimitiveComparisonOperation | ArrayComparisonOperation

export type OneToManyComparisonOperation = `all` | `allAndNotEmpty` | `some` | `none` | `noneAndNotEmpty`

// VALUELESS (Blueprint)
export interface OneToOneComparisonBlueprint {
  operation?: OneToOneComparisonOperation // defaults to 'equal'
  negation?: boolean // defaults to false
}

export interface OneToManyComparisonBlueprint {
  oneToManyOperation: OneToManyComparisonOperation // defaults to 'all'
  operation?: OneToOneComparisonOperation // defaults to 'equal', "oneToOneOperation"
  negation?: boolean // defaults to false
}

export type ComparisonBlueprint = OneToOneComparisonBlueprint | OneToManyComparisonBlueprint

export function compareValues<TValue = unknown>(a: TValue, b: TValue, operation: OneToOneComparisonOperation = `equal`, negate: boolean = false) {
  let result = false

  if (operation === `equal`) result = isEqual(a, b)
  else if (operation === `not_equal`) result = !isEqual(a, b)
  else if (ArrayComparisonOperations.includes(operation as any)) {
    // ERROR: Primitive comparison operation used for comparing arrays
    if (!isArray(a) || !isArray(b)) debugger

    const A = a as any[]
    const B = b as any[]

    if (operation === `intersects`) result = A.some(item => B.includes(item)) // some item of A is in B
    else if (operation === `contains`) result = B.every(item => A.includes(item)) // every item of B is in A
    else if (operation === `contained_by`) result = A.every(item => B.includes(item)) // every item of A is in B
  }
  // primitive
  else if (operation === `greater_than`) result = a > b
  else if (operation === `less_than`) result = a < b
  else if (operation === `greater_than_or_equal`) result = a >= b
  else if (operation === `less_than_or_equal`) result = a <= b

  return negate ? !result : result
}

/**
 * Compares a value against every item of an array
 */
export function compareValueAgainstSet<TValue = unknown>(value: TValue, set: TValue[], comparison: OneToManyComparisonBlueprint) {
  const itemComparisons = set.map(a => compareValues(value, a, comparison.operation, comparison.negation))

  let result = false

  if (comparison.oneToManyOperation === `all`) result = itemComparisons.every(Boolean)
  if (comparison.oneToManyOperation === `allAndNotEmpty`) result = itemComparisons.some(Boolean) && itemComparisons.length > 0
  if (comparison.oneToManyOperation === `some`) result = itemComparisons.some(Boolean) && itemComparisons.length > 0
  if (comparison.oneToManyOperation === `none`) result = !itemComparisons.some(Boolean)
  if (comparison.oneToManyOperation === `noneAndNotEmpty`) result = !itemComparisons.some(Boolean) && itemComparisons.length > 0

  return comparison.negation ? !result : result
}

/**
 * Compares every item of an array against a value
 */
export function compareSetAgainstValue<TValue = unknown>(set: TValue[], value: TValue, comparison: OneToManyComparisonBlueprint) {
  const itemComparisons = set.map(a => compareValues(a, value, comparison.operation, comparison.negation))

  let result = false

  if (comparison.oneToManyOperation === `all`) result = itemComparisons.every(Boolean)
  if (comparison.oneToManyOperation === `allAndNotEmpty`) result = itemComparisons.some(Boolean) && itemComparisons.length > 0
  if (comparison.oneToManyOperation === `some`) result = itemComparisons.some(Boolean) && itemComparisons.length > 0
  if (comparison.oneToManyOperation === `none`) result = !itemComparisons.some(Boolean)
  if (comparison.oneToManyOperation === `noneAndNotEmpty`) result = !itemComparisons.some(Boolean) && itemComparisons.length > 0

  return comparison.negation ? !result : result
}

/** Converts a 1:1 operation to the proper ArrayComparassion operation */
export function arrayOperation(oneToMany: OneToManyComparisonOperation, oneToOne: OneToOneComparisonOperation = `equal`): { operation: ArrayComparisonOperation; negate: boolean } {
  if (oneToMany === `all` || oneToMany === `allAndNotEmpty`) {
    if (oneToOne === `equal`) return { operation: `equal`, negate: false }
    if (oneToOne === `not_equal`) return { operation: `not_equal`, negate: false }

    // ERROR: Combination not implemented
    debugger
  } else if (oneToMany === `some`) {
    if (oneToOne === `equal`) return { operation: `intersects`, negate: false }
    else if (oneToOne === `not_equal`) return { operation: `intersects`, negate: true }

    // ERROR: Combination not implemented
    debugger
  }

  // ERROR: Combination not implemented
  debugger

  return null as any
}
