/**
 * A ARTIFICIAL TOKEN is created manually by some analysis phase, effectively "injecting" new characters that
 *    were not part of the original expression.
 *
 * They have no interval, since they are not part of the original expression.
 */

import { Interval } from "@december/utils"
import { TokenKind } from "../kind"
import { IToken } from "./base"

export default class ArtificialToken implements IToken {
  public readonly type: `artificial` = `artificial`
  //
  public readonly kind: TokenKind
  public readonly content: string

  constructor(kind: TokenKind, content: string) {
    this.kind = kind
    this.content = content
  }

  clone() {
    return new ArtificialToken(this.kind, this.content)
  }

  toString() {
    return `"${this.content}" (artificial)`
  }
}
