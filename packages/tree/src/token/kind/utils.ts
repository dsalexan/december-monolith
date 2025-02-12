import { Nullable } from "tsdef"

import { Block, Paint, paint } from "../../logger"

import { TokenKind } from "./base"
import { TokenCategory } from "./categories"

/** Return color for TokenKind */
export function getTokenKindColor(kind: string, category: TokenCategory, forceForeground: boolean = false): Nullable<Paint> {
  let color: Nullable<Paint> = null

  if (category === `whitespace`) color = forceForeground ? paint.grey : paint.bgGray
  else if (category === `unknown`) color = paint.red.bold
  else if (category === `literal`) color = paint.blue
  else if (category === `separator`) color = paint.green
  else if (category === `operator`) color = paint.yellow
  else if (category === `keyword`) color = paint.magenta
  else throw new Error(`Unexpected token kind "${tokenKindToString(kind, category)}"`)

  return color
}

/** Return TokenKind string as blocks */
export function getTokenKindBlocks(kind: string, category: TokenCategory): Block[] {
  return [paint.identity(kind), paint.grey.dim(`:`), paint.dim.grey(category)]
}

/** Return TokenKind string */
export function tokenKindToString(kind: string, category: TokenCategory): string {
  return `${kind}:${category}`
}
