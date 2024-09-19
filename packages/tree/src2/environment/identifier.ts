export class BaseIdentifier {
  type: string

  constructor(type: string) {
    this.type = type
  }
}

export class NamedIdentifier extends BaseIdentifier {
  name: string

  constructor(name: string) {
    super(`named`)
    this.name = name
  }
}

export type Identifier = NamedIdentifier

export interface IdentifiedValue<TValue = any> {
  name: string
  getValue: () => TValue
}
