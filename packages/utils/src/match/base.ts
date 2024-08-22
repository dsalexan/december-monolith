export class BasePattern {
  type: string
  //
  negate?: boolean

  constructor(type: string, options: Partial<BasePatternOptions> = {}) {
    this.type = type
    this.negate = options?.negate ?? false
  }

  _prepare(value: unknown): unknown {
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
}
