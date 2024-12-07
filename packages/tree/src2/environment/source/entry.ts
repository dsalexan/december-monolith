import { IdentifiedDataContext, Identifier } from "./../identifier"

import { isSourcedValue, SourcedValue } from "./value"

export interface BaseSourceEntry<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> {
  type: string
  name: Identifier[`name`]
  value: SourcedValue<TValue, TContext>
  fallback?: boolean
}

export interface KeySourceEntry<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> extends BaseSourceEntry<TValue, TContext> {
  type: `key`
  key: string
}

export interface MatchSourceEntry<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> extends BaseSourceEntry<TValue, TContext> {
  type: `match`
  match: (identifier: Identifier) => boolean
}

export type SourceEntry<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> = KeySourceEntry<TValue, TContext> | MatchSourceEntry<TValue, TContext>
export type SourceEntryType = SourceEntry<unknown>[`type`]

/** Test is a value is a source entry */
export function isSourceEntry<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext>(value: unknown): value is SourceEntry<TValue, TContext> {
  return typeof value === `object` && value !== null && `type` in value && `name` in value && `value` in value && isSourcedValue(value.value)
}
