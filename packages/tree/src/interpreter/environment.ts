import assert from "assert"

import { Match } from "@december/utils"

import { RuntimeValue } from "./valueTypes"
import { MaybeUndefined } from "tsdef"

export type VariableName = string

export interface ResolutionPattern {
  pattern: Match.Pattern
  variableName: VariableName
}

export interface ResolvedVariableName {
  variableName: VariableName
  environment: Environment
}

export const VARIABLE_NOT_FOUND = Symbol.for(`environment:variable-not-found`)
export type VariableNotFound = typeof VARIABLE_NOT_FOUND

export type EnvironmentGetter<TValue> = (variableName: VariableName, environment: Environment) => RuntimeValue<TValue>

export default class Environment {
  private parent?: Environment
  private variables: Map<VariableName, RuntimeValue<any>>
  // private getters: Map<VariableName, EnvironmentGetter<any>>
  private patterns: Map<string, ResolutionPattern>

  constructor(parent?: Environment) {
    this.parent = parent
    this.variables = new Map()
    // this.getters = new Map()
    this.patterns = new Map()
  }

  /** Check all patterns to resolve variable name */
  public resolveByPattern(unresolvedVariableName: VariableName): MaybeUndefined<ResolvedVariableName> {
    for (const [key, { pattern, variableName }] of this.patterns) {
      const match = pattern.match(unresolvedVariableName)
      if (match.isMatch) return { variableName, environment: this }
    }

    return undefined
  }

  /** Resolve variable name in environment tree */
  public resolve(unresolvedVariableName: VariableName): ResolvedVariableName | VariableNotFound {
    // 1. Just a plain old variable
    if (this.variables.has(unresolvedVariableName)) return { variableName: unresolvedVariableName, environment: this }

    // 2. Variable following a dynamic pattern
    const byPattern = this.resolveByPattern(unresolvedVariableName)
    if (byPattern) return byPattern

    // 3. Try to resolve in parent environment
    if (this.parent) return this.parent.resolve(unresolvedVariableName)

    // throw new Error(`Variable "${unresolvedVariableName}" not found in this environment.`)
    return VARIABLE_NOT_FOUND
  }

  /** Get variable name value from environment tree */
  public get(unresolvedVariableName: VariableName): RuntimeValue<any> | VariableNotFound {
    // 1. Resolve final variable name (if chained)
    const resolvedVariable = this.resolve(unresolvedVariableName)
    if (resolvedVariable === VARIABLE_NOT_FOUND) return VARIABLE_NOT_FOUND

    const { variableName, environment } = resolvedVariable

    // 2. Get the value from the resolved variable name
    if (environment.variables.has(variableName)) return environment.variables.get(variableName)!

    // throw new Error(`Variable "${unresolvedVariableName}" not found in this environment.`)
    return VARIABLE_NOT_FOUND
  }

  /** Assigns a runtime value to a variable name */
  public assignVariable<TValue = any>(variableName: VariableName, value: RuntimeValue<TValue>) {
    assert(!this.variables.has(variableName), `Variable "${variableName}" already defined in this environment.`)

    this.variables.set(variableName, value)
  }

  /** Register a resolution pattern for "complex" variable names */
  public registerResolutionPattern(key: string, variableName: VariableName, pattern: Match.Pattern) {
    assert(!this.patterns.has(key), `Resolution pattern "${key}" already defined in this environment.`)

    this.patterns.set(key, { pattern, variableName })
  }
}
