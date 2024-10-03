export class BasePattern {
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

  _match(value: unknown): boolean {
    throw new Error(`Unimplemented _match`)
  }

  match(value: unknown): boolean {
    const preparedValue = this._prepare(value)

    const result = this._match(preparedValue)

    return this.negate ? !result : result
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
