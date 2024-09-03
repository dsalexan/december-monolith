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
}

export interface BasePatternOptions {
  negate?: boolean
  caseInsensitive?: boolean
}
