import { BasePattern } from "../base"

import { ContainsElementPattern, SetMembershipPatternTypes, SetMembershipPatternType, SetMembershipPattern } from "./membership"

export { ContainsElementPattern, CONTAINS, NOT_CONTAINS } from "./membership"

export const SetPatternTypes = [...SetMembershipPatternTypes]
export type SetPatternType = (typeof SetPatternTypes)[number]

export type SetPattern<TSetValue extends readonly unknown[] = unknown[]> = SetMembershipPattern<TSetValue>

export function isSetPattern<TSetValue extends readonly unknown[] = unknown[]>(pattern: BasePattern): pattern is SetMembershipPattern<TSetValue> {
  return SetMembershipPatternTypes.includes(pattern.type as any)
}
