import { BaseIdentifier, Identifier } from "../identifier"
import BaseSource from "./base"

export default class ObjectSource extends BaseSource {
  declare type: `object`

  object: Record<string, any> = {}

  constructor(name: string) {
    super(`object`, name)
  }

  public has(identifier: Identifier) {
    if (identifier.type === `named`) return this.object[identifier.name] !== undefined

    throw new Error(`Invalid identifier type "${identifier.type}" for object source checker`)
  }

  public get(identifier: Identifier) {
    if (identifier.type === `named`) return { name: identifier.name, getValue: () => this.object[identifier.name] }

    throw new Error(`Invalid identifier type "${identifier.type}" for object source getter`)
  }
}
