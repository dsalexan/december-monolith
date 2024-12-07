import type Environment from ".."
import { Simbol } from ".."
import { Identifier, IdentifiedData, IdentifiedDataContext } from "../identifier"

/** Sources are not N:1 to environments. Many envs can ask for many sources, thats why any request must inform the original environment too */

export default class BaseSource<TContext extends IdentifiedDataContext = IdentifiedDataContext> {
  type: string
  name: string

  constructor(type: string, name: string) {
    this.type = type
    this.name = name
  }

  public size() {
    throw new Error(`Unimplemented object source size getter`)
  }

  protected _has(environment: Environment, identifier: Identifier, includesFallback: boolean = false): boolean {
    throw new Error(`Unimplemented object source checker`)
  }

  protected _get<TValue>(environment: Environment, identifier: Identifier, includesFallback: boolean = false): IdentifiedData<TValue, TContext> {
    throw new Error(`Unimplemented object source getter`)
  }

  protected _getAssociatedIdentifiers(environment: Environment, identifier: Identifier, includesFallback: boolean = false): Identifier[] {
    throw new Error(`Unimplemented object source associated identifiers getter`)
  }

  public has(environment: Environment, identifier: Identifier, includesFallback: boolean = false): boolean {
    return this._has(environment, identifier, includesFallback)
  }

  /** Returns data for identifier */
  public get<TValue>(environment: Environment, identifier: Identifier, includesFallback: boolean = false): IdentifiedData<TValue, TContext> {
    return this._get<TValue>(environment, identifier, includesFallback)
  }

  public getAssociatedIdentifiers(environment: Environment, identifier: Identifier, includesFallback: boolean = false): Identifier[] {
    return this._getAssociatedIdentifiers(environment, identifier, includesFallback)
  }
}
