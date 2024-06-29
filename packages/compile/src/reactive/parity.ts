import crypto from "crypto"
import { set, get } from "lodash"

export class Parity {
  key: string
  hash: string
  _base: string = `_.parity`

  static generate() {
    return crypto.randomBytes(16).toString(`hex`)
  }

  constructor(key: string, hash?: string) {
    this.key = key
    this.hash = hash || Parity.generate()
  }

  get path() {
    return `${this._base}.["${this.key}"]`
  }

  refresh() {
    this.hash = Parity.generate()
  }

  equals(other: Parity | ParityHash | ParitySignature) {
    const otherHash = typeof other === `string` ? other : other.hash

    return this.hash === otherHash
  }

  /** Injects parity signature at base */
  inject(data: object) {
    const path = this.path

    // ERROR: There is something on path
    if (get(data, path) !== undefined) debugger

    set(data, path, this.hash)
  }

  signature(): ParitySignature {
    return { key: this.key, hash: this.hash }
  }
}

export type ParityKey = Parity[`key`]
export type ParityHash = Parity[`hash`]

export type ParitySignature = { key: ParityKey; hash: ParityHash }

export class ParityManager {
  hashes: Record<string, string> = {}

  constructor() {
    this.hashes = {}
  }

  set(path: string, value: any) {
    const stringifiedValue = String(value)
    const hash = crypto.createHash(`md5`).update(stringifiedValue).digest(`hex`)

    this.hashes[path] = hash
  }

  has(path: string): boolean {
    return this.hashes[path] !== undefined
  }

  check(path: string, value: any): boolean {
    const stringifiedValue = String(value)
    const hash = crypto.createHash(`md5`).update(stringifiedValue).digest(`hex`)

    return this.hashes[path] === hash
  }
}
