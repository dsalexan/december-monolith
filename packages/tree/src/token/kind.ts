/** https://en.wikipedia.org/wiki/Lexical_analysis */

import { Nullable } from "tsdef"
import { Block, Paint, paint } from "../logger"
import { difference, isString } from "lodash"
import assert from "assert"

// (Lexical category)                                                                                              | Explanation                                            | Sample token values                                |
// | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
// | [identifier](https://en.wikipedia.org/wiki/Identifier_(computer_languages) "Identifier (computer languages)") | Names assigned by the programmer.                      | `x`, `color`, `UP`                                 |
// | [keyword](https://en.wikipedia.org/wiki/Reserved_word "Reserved word")                                        | Reserved words of the language.                        | `if`, `while`, `return`                            |
// | [separator/punctuator](https://en.wikipedia.org/wiki/Delimiter "Delimiter")                                   | Punctuation characters and paired delimiters.          | `}`, `(`, `;`                                      |
// | [operator](https://en.wikipedia.org/wiki/Operator_(computer_programming) "Operator (computer programming)")   | Symbols that operate on arguments and produce results. | `+`, `<`, `=`                                      |
// | [literal](https://en.wikipedia.org/wiki/Literal_(computer_programming) "Literal (computer programming)")      | Numeric, logical, textual, and reference literals.     | `true`, `6.02e23`, `"music"`                       |
// | [comment](https://en.wikipedia.org/wiki/Comment_(computer_programming) "Comment (computer programming)")      | Line or block comments. Usually discarded.             | `/* Retrieves user data */`, `// must be negative` |
// | [whitespace](https://en.wikipedia.org/wiki/Whitespace_character "Whitespace character")                       | Groups of non-printable characters. Usually discarded. | –                                                  |

export const TOKEN_CATEGORIES = [
  `identifier`, //
  `keyword`,
  `separator`,
  `operator`,
  `literal`,
  `comment`,
  `whitespace`,
  //
  `unknown`, // for lexical analysis only
] as const

export type TokenCategory = (typeof TOKEN_CATEGORIES)[number]

export const TOKEN_KIND_IDS = {
  // identifier: [`identifier`],
  //
  if: [`keyword`],
  then: [`keyword`],
  else: [`keyword`],
  expression_context: [`keyword`],
  string_context: [`keyword`],
  //
  comma: [`separator`],
  semi_colon: [`separator`],
  double_colon: [`separator`],
  colon: [`separator`],
  open_parenthesis: [`separator`], // (
  close_parenthesis: [`separator`], // )
  open_braces: [`separator`], // [
  close_braces: [`separator`], // ]
  open_brackets: [`separator`], // {
  close_brackets: [`separator`], // }
  quotes: [`separator`], // "
  percentage: [`separator`], // %
  //
  pipe: [`separator`, `operator`], // OR, PIPE
  //
  ampersand: [`operator`], // AND
  equals: [`operator`],
  not_equals: [`operator`],
  greater_or_equal: [`operator`],
  smaller_or_equal: [`operator`],
  greater: [`operator`],
  smaller: [`operator`],
  asterisk: [`operator`], // multiplication
  slash: [`operator`], // division
  plus: [`operator`], // addition
  dash: [`operator`], // subtraction
  //
  number: [`literal`],
  string: [`literal`],
  //
  comment: [`comment`],
  whitespace: [`whitespace`],
  //
  unknown: [`unknown`],
} as const
export type TokenKindName = keyof typeof TOKEN_KIND_IDS

export interface TokenKind {
  categories: TokenCategory[]
  name: TokenKindName
}

/** Build TokenKind from default */
export function getTokenKind(name: TokenKindName, categories?: TokenCategory[]): TokenKind {
  categories ??= TOKEN_KIND_IDS[name] as any as TokenCategory[]

  return { name, categories }
}

/** Return color for TokenKind */
export function getTokenKindColor(kind: TokenKind, forceForeground: boolean = false): Nullable<Paint> {
  let color: Nullable<Paint> = null

  if (kind.categories.includes(`whitespace`)) color = forceForeground ? paint.grey : paint.bgGray
  else if (kind.categories.includes(`unknown`)) color = paint.red.bold
  else if (kind.categories.includes(`literal`)) color = paint.blue
  else if (kind.categories.includes(`separator`)) color = paint.green
  else if (kind.categories.includes(`operator`)) color = paint.yellow
  else if (kind.categories.includes(`keyword`)) color = paint.magenta
  else throw new Error(`Unexpected token kind "${tokenKindToString(kind)}"`)

  return color
}

/** Return TokenKind string as blocks */
export function getTokenKindBlocks(kind: TokenKind): Block[] {
  return [paint.identity(kind.name), paint.grey.dim(`:`), ...kind.categories.map(category => paint.dim.grey(category))]
}

/** Return TokenKind string */
export function tokenKindToString(kind: TokenKind): string {
  return `${kind.name}:${kind.categories.join(`,`)}`
}
