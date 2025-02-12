import { TokenCategory } from "./categories"

export type TokenKind =
  //
  | `if` //
  | `then`
  | `else`
  | `injection_function`
  | `injection_placeholder`
  //
  | `comma`
  | `semi_colon`
  | `double_colon`
  | `colon`
  | `open_parenthesis`
  | `close_parenthesis`
  | `open_braces`
  | `close_braces`
  | `open_brackets`
  | `close_brackets`
  | `quotes`
  | `percentage`
  //
  | `pipe`
  //
  | `ampersand`
  | `equals`
  | `not_equals`
  | `greater_or_equal`
  | `smaller_or_equal`
  | `greater`
  | `smaller`
  | `caret`
  | `asterisk`
  | `slash`
  | `plus`
  | `dash`
  //
  | `number`
  | `string`
  //
  | `comment`
  | `whitespace`
  //
  | `unknown`

export const TOKEN_KIND_CATEGORIES: Record<TokenKind, TokenCategory> = {
  if: `keyword`,
  then: `keyword`,
  else: `keyword`,
  injection_function: `keyword`,
  injection_placeholder: `keyword`,
  //
  comma: `separator`,
  semi_colon: `separator`,
  double_colon: `separator`,
  colon: `separator`,
  open_parenthesis: `separator`, // (
  close_parenthesis: `separator`, // )
  open_braces: `separator`, // [
  close_braces: `separator`, // ]
  open_brackets: `separator`, // {
  close_brackets: `separator`, // }
  quotes: `separator`, // "
  percentage: `separator`, // %
  //
  pipe: `separator`, // OR, PIPE
  //
  ampersand: `operator`, // AND
  equals: `operator`,
  not_equals: `operator`,
  greater_or_equal: `operator`,
  smaller_or_equal: `operator`,
  greater: `operator`,
  smaller: `operator`,
  caret: `operator`, // exponentiation
  asterisk: `operator`, // multiplication
  slash: `operator`, // division
  plus: `operator`, // addition
  dash: `operator`, // subtraction
  //
  number: `literal`,
  string: `literal`,
  //
  comment: `comment`,
  whitespace: `whitespace`,
  //
  unknown: `unknown`,
}
