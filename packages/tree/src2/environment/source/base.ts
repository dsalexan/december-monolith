import { IdentifiedValue, Identifier } from "../identifier"

export default class BaseSource {
  type: string
  name: string

  constructor(type: string, name: string) {
    this.type = type
    this.name = name
  }

  protected _has(identifier: Identifier): boolean {
    throw new Error(`Unimplemented object source checker`)
  }

  protected _get(identifier: Identifier): IdentifiedValue {
    throw new Error(`Unimplemented object source getter`)
  }

  public has(identifier: Identifier): boolean {
    return this._has(identifier)
  }

  public get(identifier: Identifier): IdentifiedValue {
    return this._get(identifier)
  }
}
