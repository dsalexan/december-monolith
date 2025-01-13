export interface PatternMatchInfo {
  isMatch: boolean
}

export interface SubPatternPatternMatchInfo extends PatternMatchInfo {
  patternMatch: BasePatternMatch
}

export interface BasePatternMatch extends PatternMatchInfo {
  type: string
  isNegated: boolean
  isCaseInsensitive: boolean
  //
  value: unknown
  preparedValue: unknown
}

export function makeGenericBasePatternMatch<TMatchInfo extends PatternMatchInfo = PatternMatchInfo>(
  type: string,
  matchInfo: TMatchInfo,
  value: unknown,
  { isNegated, isCaseInsensitive, preparedValue }: Partial<Pick<BasePatternMatch, `isNegated` | `isCaseInsensitive` | `preparedValue`>> = {},
): BasePatternMatch {
  return {
    ...matchInfo,
    //
    type,
    isNegated: isNegated ?? false,
    isCaseInsensitive: isCaseInsensitive ?? false,
    //
    value,
    preparedValue: preparedValue ?? value,
  }
}

export class BasePattern<TMatchInfo extends PatternMatchInfo = PatternMatchInfo> {
  type: string
  //
  negate?: boolean
  caseInsensitive?: boolean

  constructor(type: string, options: Partial<BasePatternOptions> = {}) {
    this.type = type

    this.negate = options?.negate ?? false
    this.caseInsensitive = options?.caseInsensitive ?? false
  }

  _prepare(value: unknown): unknown {
    if (this.caseInsensitive && typeof value === `string`) return value.toLowerCase()

    return value
  }

  _match(value: unknown, ...args: unknown[]): TMatchInfo {
    throw new Error(`Unimplemented _match`)
  }

  match(value: unknown, ...args: unknown[]): BasePatternMatch {
    const preparedValue = this._prepare(value)

    const matchInfo = this._match(preparedValue, ...args)

    return {
      ...matchInfo,
      type: this.type,
      isMatch: this.negate ? !matchInfo.isMatch : matchInfo.isMatch,
      isNegated: this.negate ?? false,
      isCaseInsensitive: this.caseInsensitive ?? false,
      value,
      preparedValue,
    }
  }

  toString() {
    const negate = this.negate ? `!` : ``
    const caseInsensitive = this.caseInsensitive ? `i` : ``

    return `${negate}${caseInsensitive}${this._toString()}`
  }

  _toString() {
    throw new Error(`Unimplemented toString`)
  }
}

export interface BasePatternOptions {
  negate?: boolean
  caseInsensitive?: boolean
}

// #region FACTORIES

export function NOT<TPattern extends BasePattern>(pattern: TPattern): TPattern {
  pattern.negate = !pattern.negate

  return pattern
}

// #endregion
