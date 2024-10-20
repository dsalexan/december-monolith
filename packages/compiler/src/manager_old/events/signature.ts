import { get, isNil, isString } from "lodash"

import { OVERRIDE, SET } from "../../mutation"
import { assert } from "console"

import { Reference } from "@december/utils/access"
import { BasePattern, BasePatternOptions } from "@december/utils/match/base"
import { ElementPattern, EQUALS } from "@december/utils/match/element"

import { ObjectID } from "../../object"

export class Signature {
  public static basePath = `__.signatures`

  public objectID: ObjectID
  public name: string
  public value: string

  constructor(objectID: ObjectID, name: string, value: string) {
    this.objectID = objectID
    this.name = name
    this.value = value
  }

  get path() {
    return `${Signature.basePath}.['${this.name}']`
  }

  get id() {
    return Signature.id(this.objectID, this.name)
  }

  check(value: string) {
    return this.value === value
  }

  instruction() {
    return OVERRIDE(this.path, this.value)
  }

  static fromData(objectID: ObjectID, name: string, data: any) {
    const signature = new Signature(objectID, name, ``)

    const value = get(data, signature.path)

    assert(!isNil(value), `Signature "${name}" not found`)

    signature.value = value

    return signature
  }

  reference(): SignatureReference {
    return Signature.reference(this.id, this.value)
  }

  static reference(id: string, value: string): SignatureReference {
    return new Reference(`signature`, { id, value })
  }

  static id(objectID: ObjectID, name: string) {
    return `${objectID}::${name}`
  }
}

export type SignatureReference = Reference<`signature`, { id: string; value: string }>

export interface SignaturePatternOptions extends BasePatternOptions {}

export class SignaturePattern extends BasePattern {
  declare type: `signature`

  idPattern: ElementPattern<string>
  valuePattern: ElementPattern<string | null>

  constructor(id: ElementPattern<string> | string, value: ElementPattern<string | null> | string | null, options: Partial<SignaturePatternOptions> = {}) {
    super(`signature`, options)

    this.idPattern = id instanceof BasePattern ? id : EQUALS(id)
    this.valuePattern = value instanceof BasePattern ? value : EQUALS(value)
  }

  override _match(signatureID: string): boolean {
    const idMatch = this.idPattern.match(signatureID)
    // const valueMatch = this.valuePattern.match(reference.value.value)

    return idMatch //&& valueMatch
  }

  override match(signatureID: string): boolean {
    return super.match(signatureID)
  }

  override _toString() {
    return `(${this.idPattern.toString()}, ${this.valuePattern.toString()})`
  }
}

export const SIGNATURE = (idPattern: ElementPattern<string> | string, valuePattern: ElementPattern<string | null> | string | null) => new SignaturePattern(idPattern, valuePattern)
