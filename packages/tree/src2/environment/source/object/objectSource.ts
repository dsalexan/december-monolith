import { values } from "lodash"
import { Primitive } from "type-fest"

import type Environment from "../.."

import { IdentifiedData, IdentifiedDataContext, IdentifiedDataValueGetterOptions, Identifier } from "../../identifier"
import { isSourcedValue, SourcedValue } from "../value"
import { BaseSourceEntry, isSourceEntry, KeySourceEntry, MatchSourceEntry, SourceEntry, SourceEntryType } from "./../entry"

import BaseSource from "../base"
import { Simbol } from "../.."
import assert from "assert"
import { MaybeUndefined, WithOptionalKeys } from "tsdef"

export type InputObjectSourceData<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> = Record<string, null | Primitive | SourcedValue<TValue, TContext>>
export type ObjectSourceData<TValue, TContext extends IdentifiedDataContext = IdentifiedDataContext> = Record<string, SourceEntry<TValue, TContext>>

export default class ObjectSource<TContext extends IdentifiedDataContext = IdentifiedDataContext> extends BaseSource<TContext> {
  declare type: `object`

  private _: {
    key: Record<KeySourceEntry<any, TContext>[`key`], KeySourceEntry<any, TContext>>
    match: Map<MatchSourceEntry<any, TContext>[`name`], MatchSourceEntry<any, TContext>>
  } = {
    key: {},
    match: new Map(),
  }

  constructor(name: string) {
    super(`object`, name)
  }

  /** Adds a keyed entry (fastest? match times maybe) */
  public addKeyEntry(entry: WithOptionalKeys<BaseSourceEntry<any, TContext>, `type` | `name`>, key: KeySourceEntry<any, TContext>[`key`]) {
    const fullEntry: KeySourceEntry<any, TContext> = { name: key, ...entry, type: `key`, key }
    assert(!this._.key[key], `Key "${key}" already exists in object source`)

    this._.key[key] = fullEntry
  }

  /** Adds a match function oriented entry */
  public addMatchEntry(entry: Omit<BaseSourceEntry<any, TContext>, `type`>, match: MatchSourceEntry<any, TContext>[`match`]) {
    const fullEntry: MatchSourceEntry<any, TContext> = { ...entry, type: `match`, match }
    assert(!this._.match.has(entry.name), `Match function already exists in object source with name "${entry.name}"`)

    this._.match.set(entry.name, fullEntry)
  }

  /** Creates a object source from a dictionary */
  public static fromDictionary<TContext extends IdentifiedDataContext = IdentifiedDataContext>(name: string, dict: Record<KeySourceEntry<any, TContext>[`key`], Primitive | SourcedValue<any, TContext>>) {
    const source = new ObjectSource<TContext>(name)

    for (const [key, maybeEntry] of Object.entries(dict)) {
      let entry: KeySourceEntry<any, TContext>

      if (isSourcedValue(maybeEntry)) {
        entry = {
          type: `key`,
          key,
          name: key,
          value: maybeEntry,
        }
      } else {
        entry = {
          type: `key`,
          key,
          name: key,
          value: { type: `simple`, value: maybeEntry },
        }
      }

      source.addKeyEntry(entry, key)
    }

    return source
  }

  /** Loops through match entries until we hit a match */
  protected getMatchEntries(identifier: Identifier, includesFallback: boolean = false) {
    const matches: MatchSourceEntry<any, TContext>[] = []
    const fallbacks: MatchSourceEntry<any, TContext>[] = []

    for (const [name, entry] of this._.match.entries()) {
      if (entry.fallback && !includesFallback) continue // ignore entry if it is FALLBACK

      if (entry.match(identifier)) {
        if (entry.fallback) fallbacks.push(entry)
        else matches.push(entry)
      }
    }

    return { matches, fallbacks }
  }

  /** Returns best entry for an identifier */
  protected getEntry(identifier: Identifier, includesFallback: boolean = false): MaybeUndefined<SourceEntry<any, TContext>> {
    const matches: SourceEntry<any, TContext>[] = []
    const fallbacks: SourceEntry<any, TContext>[] = []

    if (identifier.type === `named`) {
      // 1. First try KEY entries
      let entry: MaybeUndefined<SourceEntry<any, TContext>> = this._.key[identifier.name]
      if (entry?.fallback && !includesFallback) {
        fallbacks.push(entry)
        // entry = undefined // ignore entry if it is FALLBACK
      } else if (entry && !entry.fallback) matches.push(entry)

      // 2. Then try MATCH entries (slower)
      if (entry === undefined) {
        const matchEntries = this.getMatchEntries(identifier, includesFallback)

        matches.push(...matchEntries.matches)
        fallbacks.push(...matchEntries.fallbacks)
      }
    } else throw new Error(`Invalid identifier type "${identifier.type}" when trying to recover a source entry`)

    assert(matches.length <= 1, `Multiple matches found for identifier "${identifier.name}" in object source`)

    return matches[0] ?? fallbacks[0]
  }

  // #region BASE OVERRIDES

  /** Returns number of entries in source */
  public size() {
    return Object.keys(this._.key).length + this._.match.size
  }

  /** Check if object has identifier (accounting for proxying IN ENVIRONMENT) */
  public _has(environment: Environment, identifier: Identifier, includesFallback: boolean = false): boolean {
    let entry = this.getEntry(identifier, includesFallback)

    // 3. Chain to environment for edge cases
    if (entry?.value.type === `proxy`) return environment.has(entry.value.value)

    return entry !== undefined
  }

  /** Return data for an identifier (accounting for proxying IN ENVIRONMENT) */
  public _get<TValue>(environment: Environment, identifier: Identifier, includesFallback: boolean = false): IdentifiedData<TValue, TContext> {
    const entry = this.getEntry(identifier, includesFallback)!
    const { value } = entry

    const data = new IdentifiedData<TValue, TContext>(identifier, entry, environment)

    if (value.type === `simple`) data.setInvoker(() => value.value as TValue)
    else if (value.type === `function`) data.setInvoker(value.value)
    else if (value.type === `proxy`) {
      const proxiedIdentifier = value.value
      data.setInvoker((context: TContext, options: IdentifiedDataValueGetterOptions = {}) => {
        const proxiedData = environment.get<TValue, TContext>(proxiedIdentifier)
        return proxiedData.getValue(context, options)
      })
    } else throw new Error(`Invalid value type "${(value as any).type}" for object source`)

    return data
  }

  /** Return associated symbols for identifier (accounting for proxying IN ENVIRONMENT) */
  public _getAssociatedIdentifiers(environment: Environment, identifier: Identifier, includesFallback: boolean = false): Identifier[] {
    const identifiers: Identifier[] = []

    const entry = this.getEntry(identifier, includesFallback)

    if (entry?.value.type === `proxy`) identifiers.push(...environment.getAssociatedIdentifiers(entry.value.value, includesFallback))

    return identifiers
  }

  // #endregion
}
