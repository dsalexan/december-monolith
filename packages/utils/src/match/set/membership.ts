import assert from "assert"

import { BasePattern, BasePatternOptions } from "../base"

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never

/**
 * MEMBERSHIP
 *    well, actually just the converse to element -> set (which would be set -> element)
 */

// #region A. Class declarations

/**
 * The expressions "A includes x" and "A contains x" are also used to mean set membership,
 * although some authors use them to mean instead "x is a subset of A".[2]
 *
 * Logician George Boolos strongly urged that "contains" be used for membership only,
 * and "includes" for the subset relation only.[3]
 */

export class ContainsElementPattern<TSetValue extends readonly unknown[] = unknown[]> extends BasePattern {
  declare type: `set_contains`
  public element: ArrayElement<TSetValue>

  constructor(element: ArrayElement<TSetValue>, options: Partial<BasePatternOptions> = {}) {
    super(`set_contains`, options)
    this.element = element
  }

  override _match<TTestSetValue extends readonly unknown[] = TSetValue>(superset: TTestSetValue): boolean {
    return superset.includes(this.element as any)
  }
}

// #endregion

// #region B. Centralized type and type assertion

export const SetMembershipPatternTypes = [`set_contains`] as const
export type SetMembershipPatternType = (typeof SetMembershipPatternTypes)[number]

export type SetMembershipPattern<TSetValue extends readonly unknown[] = unknown[]> = ContainsElementPattern<TSetValue>

export function isSetMembershipPattern<TSetValue extends readonly unknown[] = unknown[]>(pattern: BasePattern): pattern is SetMembershipPattern<TSetValue> {
  return SetMembershipPatternTypes.includes(pattern.type as any)
}

// #endregion

// #region C. Factories
export function CONTAINS<TSetValue extends readonly unknown[]>(value: ArrayElement<TSetValue>, negate?: boolean): ContainsElementPattern<TSetValue> {
  return new ContainsElementPattern(value, { negate })
}

export function NOT_CONTAINS<TSetValue extends readonly unknown[]>(value: ArrayElement<TSetValue>): ContainsElementPattern<TSetValue> {
  return CONTAINS<TSetValue>(value, true)
}

// #endregion
