import type { TokenTypeName } from "."

export interface BaseTokenPattern {
  appendToBuffer?: TokenTypeName
  matchSequence?: boolean
}

export interface TokenPatternString extends BaseTokenPattern {
  type: `string`
  value: string
}

export interface TokenPatternRegex extends BaseTokenPattern {
  type: `regex`
  pattern: RegExp
}

export interface TokenPatternList extends BaseTokenPattern {
  type: `list`
  values: string[]
}

export interface TokenPatternNone extends BaseTokenPattern {
  type: `none`
}

export type TokenPattern = TokenPatternString | TokenPatternRegex | TokenPatternList | TokenPatternNone
