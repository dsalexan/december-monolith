import { Match } from "@december/utils"

import { RuntimeValue, VariableValue } from "./runtime"
import { MaybeUndefined, Nullable } from "tsdef"
import assert from "assert"
import { Simbol } from "../symbolTable"

export type VariableName = string

export const VARIABLE_NOT_FOUND: unique symbol = Symbol.for(`environment:variable-not-found`)
export type VariableNotFound = typeof VARIABLE_NOT_FOUND

export default class Environment {
  private _version: number = 0
  public name: string
  public parent?: Environment
  //
  private values: {
    byVariableName: Map<VariableName, RuntimeValue<any>>
    byPattern: Map<string, VariableNameByPattern>
  }

  constructor(name: string, parent?: Environment) {
    this.name = name
    this.parent = parent
    //
    this.values = {
      byVariableName: new Map(),
      byPattern: new Map(),
    }
  }

  public getVersion(): string {
    return `${this.parent ? this.parent.getVersion() : ``}${this._version}`
  }

  /** Checks values' maps for variable name (returning matching runtime value)  */
  public getValue<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(variableName: string): Nullable<TRuntimeValue> {
    // 1. Check by name
    const value = this.values.byVariableName.get(variableName)
    if (value) return value as TRuntimeValue

    // 2. Check by pattern
    for (const { pattern, value } of this.values.byPattern.values()) {
      const match = pattern.match(variableName)
      if (match.isMatch) return value as TRuntimeValue
    }

    return null
  }

  /** Resolve "final" variable name through proxy variables and environment chains */
  public resolve(unresolvedVariableName: VariableName, entryEnvironment?: Environment): Nullable<ResolvedVariable> {
    entryEnvironment ??= this

    // 1. First check if variable exists HERE
    const value = this.getValue(unresolvedVariableName)
    if (value) {
      const resolvedVariable: ResolvedVariable = { variableName: unresolvedVariableName, environment: this }

      // (a regular runtime variable )
      if (!VariableValue.isVariableValue(value)) return resolvedVariable

      // 2. Run resolve from the bottom up for VARIABLE_VALUE
      const resolvedVariableValue = entryEnvironment.resolve(value.value, entryEnvironment)
      //     (variable not found in the environment chain, so just return "resolved, not found")
      if (!resolvedVariableValue) return { variableName: value.value, environment: null, from: resolvedVariable }

      //     (value found in chain, return it with from attached)
      //     (value RESOLVED, not found, in chain, return it with from attached)
      return {
        variableName: resolvedVariableValue.variableName, //
        environment: resolvedVariableValue.environment,
        from: resolvedVariable,
      }
    }

    // 2. If not, ask parent
    if (this.parent) return this.parent.resolve(unresolvedVariableName, entryEnvironment)

    return null
  }

  /** Resolve and get variable name through environment chain */
  public get<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>>(unresolvedVariableName: VariableName): Nullable<TRuntimeValue> {
    // 1. Resolve variable name
    const resolvedVariable = this.resolve(unresolvedVariableName)
    if (!resolvedVariable) return null

    // 2. Was resolved, but value was not found
    if (resolvedVariable.environment === null) return null

    // 3. Resolved AND found value, return it
    const value = resolvedVariable.environment.getValue(resolvedVariable.variableName)
    assert(RuntimeValue.isRuntimeValue(value), `Value must be a RuntimeValue`)

    return value as TRuntimeValue
  }

  /** Assigns value to VariableName */
  public assignValue(variableName: VariableName, value: RuntimeValue<any>, update: boolean = false): boolean {
    if (!update) {
      assert(!this.values.byVariableName.has(variableName), `Variable name "${variableName}" already exists in environment.`)

      // return false
    }

    if (update && this.values.byVariableName.has(variableName)) {
      const currentValue = this.values.byVariableName.get(variableName)!
      if (currentValue.isEquals(value)) return false
    }

    this.values.byVariableName.set(variableName, value)
    this._version++

    return true
  }

  /** Assigns value to multiple variable names */
  public assignValueToMultipleVariables(variableNames: VariableName[], value: RuntimeValue<any>, update: boolean = false) {
    for (const variableName of variableNames) {
      this.assignValue(variableName, value, update)
    }
  }

  /** Assigns value to pattern */
  public assignValueToPattern(name: string, pattern: Match.Pattern, value: RuntimeValue<any>, update: boolean = false) {
    if (!update) assert(!this.values.byPattern.has(name), `Pattern "${name}" already exists in environment.`)

    this.values.byPattern.set(name, { pattern, value })
    this._version++
  }

  /** Rasterize all indirect variables (a variable pointing to another variable) in environment tree as symbols */
  public rasterizeIndirectVariablesAsSymbols(): Simbol[] {
    const symbols: Map<Simbol[`key`], Simbol> = new Map()

    this._rasterizeIndirectVariablesAsSymbols(symbols)
    if (this.parent) this.parent._rasterizeIndirectVariablesAsSymbols(symbols)

    return [...symbols.values()]
  }

  /** Rasterize all indirect variables (a variable pointing to another variable) in environment as symbols */
  protected _rasterizeIndirectVariablesAsSymbols(symbolMap: Map<Simbol[`key`], Simbol>): boolean {
    let somethingWasIndexed = false

    // 1. Index indirect variables by VARIABLE NAME
    for (const [key, runtimeValue] of this.values.byVariableName.entries()) {
      if (!VariableValue.isVariableValue(runtimeValue)) continue // bail out if runtimeValue is not indirect

      // (we only register then first occurence, we don't need to know which nodes are linked to it)
      const variableName = runtimeValue.value
      assert(variableName === key, `VariableName should match key`)
      if (symbolMap.has(variableName)) continue

      // (at least for now a VARIABLE_VALUE is always of type:name)
      const symbol = new Simbol({ type: `name`, key: variableName, name: variableName })
      symbolMap.set(symbol.key, symbol)

      somethingWasIndexed = true
    }

    // 2. Index indirect variables by PATTERN
    for (const { value: runtimeValue } of this.values.byPattern.values()) {
      if (!VariableValue.isVariableValue(runtimeValue)) continue // bail out if runtimeValue is not indirect

      // (we only register then first occurence, we don't need to know which nodes are linked to it)
      const variableName = runtimeValue.value
      if (symbolMap.has(variableName)) continue

      // (at least for now a VARIABLE_VALUE is always of type:name)
      const symbol = new Simbol({ type: `name`, key: variableName, name: variableName })
      symbolMap.set(symbol.key, symbol)

      somethingWasIndexed = true
    }

    return somethingWasIndexed
  }
}

export interface VariableNameByPattern<TRuntimeValue extends RuntimeValue<any> = RuntimeValue<any>> {
  pattern: Match.Pattern
  value: TRuntimeValue
}

export interface ResolvedVariable {
  variableName: VariableName
  environment: Nullable<Environment>
  from?: MaybeUndefined<ResolvedVariable>
}
