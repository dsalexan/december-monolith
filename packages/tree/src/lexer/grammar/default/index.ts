import assert from "assert"
import { isString } from "lodash"

import { Match } from "@december/utils"
import { EQUALS, REGEX } from "@december/utils/match/element"

import { LexicalGrammarCustomTest, LexicalGrammarEntry } from ".."
import { getTokenKind, TokenKind, TokenKindName } from "../../../token/kind"

/** Creates a LexicalGrammarEntry */
export function createEntry(priority: number, kind: TokenKind | TokenKindName, test: Match.Pattern | LexicalGrammarCustomTest): LexicalGrammarEntry {
  return { priority, kind: isString(kind) ? getTokenKind(kind) : kind, test }
}

// #region LITERALS

const LITERAL_PRIORITY = 10 ** 11

export const NUMBER = createEntry(LITERAL_PRIORITY + 2, `number`, REGEX(/^(([0-9]+)|([\.][0-9]+)|([0-9]+[\.][0-9]+))$/))
const _stringPattern = `[0-9A-Za-z_$@:\\.\\?\\!]`
export const STRING = createEntry(LITERAL_PRIORITY + 1, `string`, REGEX(new RegExp(`^${_stringPattern}+$`))) //  /^[0-9A-Za-z_$@:\.]+$/

export const LITERAL = [NUMBER, STRING]

// #endregion

// #region SEPARATORS

const SEPARATOR_PRIORITY = 10 ** 3

export const COMMA = createEntry(SEPARATOR_PRIORITY + 15, `comma`, EQUALS(`,`))
export const SEMI_COLON = createEntry(SEPARATOR_PRIORITY + 14, `semi_colon`, EQUALS(`;`))
export const DOUBLE_COLON = createEntry(LITERAL_PRIORITY + 14, `double_colon`, EQUALS(`::`)) // REGEX(new RegExp(`^${_stringPattern}*(::)${_stringPattern}*$`))
// export const COLON = createEntry(SEPARATOR_PRIORITY + 13, `colon`, EQUALS(`:`))

export const OPEN_PARENTHESIS = createEntry(SEPARATOR_PRIORITY + 7, `open_parenthesis`, EQUALS(`(`))
export const CLOSE_PARENTHESIS = createEntry(SEPARATOR_PRIORITY + 7, `close_parenthesis`, EQUALS(`)`))
export const OPEN_BRACES = createEntry(SEPARATOR_PRIORITY + 6, `open_braces`, EQUALS(`[`))
export const CLOSE_BRACES = createEntry(SEPARATOR_PRIORITY + 6, `close_braces`, EQUALS(`]`))
export const OPEN_BRACKETS = createEntry(SEPARATOR_PRIORITY + 5, `open_brackets`, EQUALS(`{`))
export const CLOSE_BRACKETS = createEntry(SEPARATOR_PRIORITY + 5, `close_brackets`, EQUALS(`}`))
export const QUOTES = createEntry(SEPARATOR_PRIORITY + 4, `quotes`, EQUALS(`"`))
export const PERCENTAGE = createEntry(SEPARATOR_PRIORITY + 3, `percentage`, EQUALS(`%`))

export const SEPARATORS_WITHOUT_PIPE = [COMMA, SEMI_COLON, DOUBLE_COLON, OPEN_PARENTHESIS, CLOSE_PARENTHESIS, OPEN_BRACES, CLOSE_BRACES, OPEN_BRACKETS, CLOSE_BRACKETS, QUOTES, PERCENTAGE]

// #endregion

// both SEPARATOR and OPERATOR
export const PIPE = createEntry(SEPARATOR_PRIORITY + 13, `pipe`, EQUALS(`|`))
export const SEPARATORS = [...SEPARATORS_WITHOUT_PIPE, PIPE]

// #region OPERATORS

const OPERATOR_PRIORITY = 10 ** 6

export const AMPERSAND = createEntry(OPERATOR_PRIORITY + 2, `ampersand`, EQUALS(`&`))

export const NOT_EQUALS = createEntry(OPERATOR_PRIORITY + 16, `not_equals`, EQUALS(`!=`))
export const _EQUALS = createEntry(OPERATOR_PRIORITY + 15, `equals`, EQUALS(`=`))
export const GREATER_OR_EQUAL = createEntry(OPERATOR_PRIORITY + 12, `greater_or_equal`, EQUALS(`>=`))
export const SMALLER_OR_EQUAL = createEntry(OPERATOR_PRIORITY + 12, `smaller_or_equal`, EQUALS(`<=`))
export const GREATER = createEntry(OPERATOR_PRIORITY + 11, `greater`, EQUALS(`>`))
export const SMALLER = createEntry(OPERATOR_PRIORITY + 11, `smaller`, EQUALS(`<`))

export const ASTERISK = createEntry(OPERATOR_PRIORITY + 107, `asterisk`, EQUALS(`*`))
export const SLASH = createEntry(OPERATOR_PRIORITY + 107, `slash`, EQUALS(`/`))
export const PLUS = createEntry(OPERATOR_PRIORITY + 105, `plus`, EQUALS(`+`))
export const DASH = createEntry(OPERATOR_PRIORITY + 105, `dash`, EQUALS(`-`))

export const OPERATORS = [PIPE, AMPERSAND, _EQUALS, GREATER_OR_EQUAL, SMALLER_OR_EQUAL, GREATER, SMALLER, ASTERISK, SLASH, PLUS, DASH]

// #endregion

// #region KEYWORDS

const KEYWORD_PRIORITY = 10 ** 20

export const _IF = createEntry(KEYWORD_PRIORITY + 1, `if`, REGEX(/^[\@\$]if$/i))
export const _THEN = createEntry(KEYWORD_PRIORITY + 2, `then`, EQUALS(`then`, true))
export const _ELSE = createEntry(KEYWORD_PRIORITY + 2, `else`, EQUALS(`else`, true))

export const KEYWORDS = [_IF, _THEN, _ELSE]

// #endregion

export const DEFAULT_GRAMMAR = [...LITERAL, ...SEPARATORS_WITHOUT_PIPE, ...OPERATORS, ...KEYWORDS]
