import assert from "assert"

import SymbolTable from "./symbolTable"
import { BaseSource, ObjectSource } from "./source"

import churchill, { Block, paint, Paint } from "../logger"
import { IdentifiedValue, BaseIdentifier, NamedIdentifier, Identifier, IdentifiedValueReturn, StrictIdentifiedValueReturn, isResolved, MISSING_VALUE } from "./identifier"
import { InputObjectSourceData, isSourcedValue, ObjectSourceData, SourcedValue } from "./source/object"
import { AnyObject } from "tsdef"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { Simbol } from "./symbolTable"
export { ObjectSourceData, default as ObjectSource } from "./source/object"

export default class Environment {
  public sources: Map<string, BaseSource> = new Map()

  clone() {
    const environment = new Environment()

    for (const source of this.sources.values()) environment.addSource(source)

    return environment
  }

  hasSource(name: string) {
    return this.sources.has(name)
  }

  addSource(source: BaseSource) {
    assert(!this.hasSource(source.name), `Source "${source.name}" already exists`)

    this.sources.set(source.name, source)

    return source
  }

  addObjectSource(name: string, data: InputObjectSourceData) {
    const source = new ObjectSource(name)

    for (const [key, value] of Object.entries(data)) {
      let sourcedValue = value as SourcedValue

      if (!isSourcedValue(value)) sourcedValue = { type: `simple`, value: value }

      source.object[key] = sourcedValue
    }

    this.addSource(source)

    return source
  }

  _has(_identifier: Identifier | string) {
    const identifier: Identifier = typeof _identifier === `string` ? new NamedIdentifier(_identifier) : _identifier

    type EnvironmentMatch = { source: string }
    const matches: EnvironmentMatch[] = []

    for (const source of this.sources.values()) {
      if (source.has(identifier)) matches.push({ source: source.name })
    }

    return matches
  }

  has(_identifier: Identifier | string) {
    return this._has(_identifier).length > 0
  }

  get(_identifier: Identifier | string, confirmedSources: string[] | null = null): IdentifiedValue {
    const identifier: Identifier = typeof _identifier === `string` ? new NamedIdentifier(_identifier) : _identifier

    type EnvironmentMatch = { source: string; value: IdentifiedValue }
    const matches: EnvironmentMatch[] = []

    const _sources = [...this.sources.values()].map(source => source.name)
    const sources = confirmedSources ? _sources.filter(name => confirmedSources.includes(name)) : _sources

    for (const name of sources) {
      const source = this.sources.get(name)!

      if (source.has(identifier)) {
        const value = source.get(identifier)
        matches.push({ source: name, value: value })
      }
    }

    assert(matches.length > 0, `We should ALWAYS first check if the identifier exists before getting it`)
    assert(matches.length === 1, `Implement handling with multiple matches`)

    return matches[0].value
  }

  get _() {
    return {
      get: (_identifier: Identifier | string, confirmedSources: string[] | null = null) => {
        if (!this.has(_identifier)) return undefined

        const sourceValue = this.get(_identifier, confirmedSources)
        const value = sourceValue.getValue.call(this, null as any, null as any)
        if (!Environment.isResolved(value)) return undefined

        return value
      },
    }
  }

  print() {
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

  public static isResolved<TValue = any>(value: IdentifiedValueReturn<TValue>): value is StrictIdentifiedValueReturn<TValue> {
    return isResolved<TValue>(value)
  }
}
