import assert from "assert"

import { BasePattern, BasePatternOptions } from "./base"

export class ConnectiveLogicalPattern<TPattern extends BasePattern = any> extends BasePattern {
  declare type: `and` | `or`
  public patterns: TPattern[]

  constructor(type: `and` | `or`, patterns: TPattern[], options: Partial<BasePatternOptions> = {}) {
    super(type, options)
    this.patterns = [...patterns]
  }

  override _match<TValue = any>(value: TValue): boolean {
    const matches = this.patterns.map(pattern => pattern.match(value))

    return this.type === `and` ? matches.every(Boolean) : matches.some(Boolean)
  }
}

export const ConnectivePatternTypes = [`and`, `or`] as const
export type ConnectivePatternType = (typeof ConnectivePatternTypes)[number]

export const LogicalPatternTypes = [...ConnectivePatternTypes]

export type LogicalPattern<TPattern extends BasePattern = any> = ConnectiveLogicalPattern<TPattern>

export function isLogicalPattern<TPattern extends BasePattern = any>(pattern: BasePattern): pattern is LogicalPattern<TPattern> {
  return LogicalPatternTypes.includes(pattern.type as any)
}

// #region FACTORIES

export function AND<TPattern extends BasePattern = any>(...patterns: TPattern[]): ConnectiveLogicalPattern<TPattern> {
  return new ConnectiveLogicalPattern(`and`, patterns)
}

export function OR<TPattern extends BasePattern = any>(...patterns: TPattern[]): ConnectiveLogicalPattern<TPattern> {
  return new ConnectiveLogicalPattern(`or`, patterns)
}

// #endregion
