import assert from "assert"

import { Simbol, SymbolTable } from "./symbolTable"
import { BaseSource, ObjectSource } from "./source"

import churchill, { Block, paint, Paint } from "../logger"
import { BaseIdentifier, NamedIdentifier, Identifier, IdentifiedData, MISSING_VALUE, IdentifiedDataContext } from "./identifier"
import { AnyObject, Nilable } from "tsdef"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { Simbol, SymbolTable, SymbolFromNodeOptions, SymbolValueInvoker, SymbolKey, UndefinedValue, NullValue } from "./symbolTable"
export { ObjectSource } from "./source"

export interface IndexedSource<TSource extends BaseSource = BaseSource> {
  source: TSource
  index: number
}

export default class Environment {
  public sources: Map<string, IndexedSource> = new Map()

  /** Clone environment (and all its sources) */
  public clone() {
    const environment = new Environment()

    for (const { source, index } of this.sources.values()) environment.addSource(source)

    return environment
  }

  /** Merge two environments (and its sources) into a single one */
  public merge(other: Environment) {
    const environment = this.clone()

    for (const { source, index } of other.sources.values()) environment.addSource(source)

    return environment
  }

  /** Check if a environment has a named source */
  public hasSource(name: string) {
    return this.sources.has(name)
  }

  /** Add new source to environment */
  public addSource(source: BaseSource) {
    assert(!this.hasSource(source.name), `Source "${source.name}" already exists`)

    const index = this.sources.size
    this.sources.set(source.name, { source, index })

    return source
  }

  // #region SOURCE PROXY METHODS

  /** Check if environment has an identifier */
  private _has(_identifier: Identifier | string, includesFallback: boolean = false) {
    const identifier: Identifier = typeof _identifier === `string` ? new NamedIdentifier(_identifier) : _identifier

    type EnvironmentMatch = { source: string }
    const matches: EnvironmentMatch[] = []

    for (const { source } of this.sources.values()) {
      if (source.has(this, identifier, includesFallback)) matches.push({ source: source.name })
    }

    return matches
  }

  /** Check if environment has an identifier */
  public has(_identifier: Identifier | string, { sourcesOut, includesFallback }: { sourcesOut?: string[]; includesFallback?: boolean } = {}): boolean {
    const matches = this._has(_identifier, includesFallback)

    if (sourcesOut) {
      sourcesOut.push(...matches.map(({ source }) => source))
    }

    return matches.length > 0
  }

  /** Get value for an identifier in environment */
  public get<TValue, TContext extends IdentifiedDataContext = null>(
    _identifier: Identifier | string,
    { confirmedSources, includesFallback }: { confirmedSources?: string[]; includesFallback?: boolean } = {},
  ): IdentifiedData<TValue, TContext> {
    const identifier: Identifier = typeof _identifier === `string` ? new NamedIdentifier(_identifier) : _identifier

    type EnvironmentMatch = { source: string; data: IdentifiedData<unknown, IdentifiedDataContext> }
    const matches: EnvironmentMatch[] = []
    const fallbacks: EnvironmentMatch[] = []

    const _sources = [...this.sources.values()].map(({ source }) => source.name)
    const sources = confirmedSources ? _sources.filter(name => confirmedSources.includes(name)) : _sources

    for (const name of sources) {
      const { source } = this.sources.get(name)!

      if (source.has(this, identifier, includesFallback)) {
        const data = source.get(this, identifier, includesFallback)

        if (data.entry.fallback) fallbacks.push({ source: name, data })
        else matches.push({ source: name, data })
      }
    }

    assert(matches.length > 0 || fallbacks.length > 0, `We should ALWAYS first check if the identifier exists before getting it`)
    assert(matches.length <= 1, `Implement handling with multiple matches`)

    return (matches[0]?.data ?? fallbacks[0].data) as IdentifiedData<TValue, TContext>
  }

  /** Returns a list of associated identifiers for a specific identifier (mostly just returning itself, but a corner case are PROXY IDENTIFIERS) */
  public getAssociatedIdentifiers(_identifier: Identifier | string, includesFallback: boolean = false): Identifier[] {
    const identifier: Identifier = typeof _identifier === `string` ? new NamedIdentifier(_identifier) : _identifier

    const identifiers: Identifier[] = [identifier]

    for (const { source } of this.sources.values()) {
      identifiers.push(...source.getAssociatedIdentifiers(this, identifier, includesFallback))
    }

    return identifiers
  }

  // #endregion

  /** Prints state of environment */
  public print() {
    const logger = _logger

    // 1. Print Scope
    console.log(`\n`)
    logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    logger
      .add(paint.grey(`ENVIRONMENT`)) //
      .info()
    logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    console.log(this)
  }
}
