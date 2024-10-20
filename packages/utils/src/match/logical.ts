import assert from "assert"

import { BasePattern, BasePatternMatch, BasePatternOptions, PatternMatchInfo } from "./base"

export interface ConnectiveLogicalPatternMatchInfo extends PatternMatchInfo {
  individualMatches: BasePatternMatch[]
}

export class ConnectiveLogicalPattern<TPattern extends BasePattern = any> extends BasePattern<ConnectiveLogicalPatternMatchInfo> {
  declare type: `and` | `or`
  public patterns: TPattern[]

  constructor(type: `and` | `or`, patterns: TPattern[], options: Partial<BasePatternOptions> = {}) {
    super(type, options)
    this.patterns = [...patterns]
  }

  override _match<TValue = any>(value: TValue): ConnectiveLogicalPatternMatchInfo {
    const matches = this.patterns.map(pattern => pattern.match(value))

    return {
      isMatch: this.type === `and` ? matches.every(match => match.isMatch) : matches.some(match => match.isMatch),
      individualMatches: matches,
    }
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
