import { Match } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"

import { DEFAULT_BINDING_POWERS } from "./bindingPowers"
import { DEFAULT_PARSERS, DefaultParserProvider } from "./parsers"

export { DEFAULT_BINDING_POWERS } from "./bindingPowers"
export { DEFAULT_PARSERS } from "./parsers"

import { BindingPower } from "../bindingPower"
import { BindingPowerEntry, ReTyperEntry, BindParserEntry, RegisterParserEntry, createBindParserEntry, createRegisterParserEntry, createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "../entries"
import { LEDParser, NUDParser, ParserFunction, StatementParser, SyntacticalDenotation } from "../parserFunction"

import { TokenKindName } from "../../../token/kind"
import { NodeType } from "../../../tree"
import { parseStatement } from "./parsers/statement"
import { parseExpression } from "./parsers/expression"
import { Entries } from "type-fest"

// LOGICAL
const _AND = createBindParserEntry<DefaultParserProvider>(`led`, `ampersand`, DEFAULT_BINDING_POWERS.LOGICAL, `parseBinaryExpression`)
const _OR = createBindParserEntry<DefaultParserProvider>(`led`, `pipe`, DEFAULT_BINDING_POWERS.LOGICAL, `parseBinaryExpression`)

// RELATIONAL
const SMALLER = createBindParserEntry<DefaultParserProvider>(`led`, `smaller`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const SMALLER_OR_EQUAL = createBindParserEntry<DefaultParserProvider>(`led`, `smaller_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const GREATER = createBindParserEntry<DefaultParserProvider>(`led`, `greater`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const GREATER_OR_EQUAL = createBindParserEntry<DefaultParserProvider>(`led`, `greater_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const _EQUALS = createBindParserEntry<DefaultParserProvider>(`led`, `equals`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const NOT_EQUALS = createBindParserEntry<DefaultParserProvider>(`led`, `not_equals`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)

// ADDITIVE/MULTIPLICATIVE
const ADDITION = createBindParserEntry<DefaultParserProvider>(`led`, `plus`, DEFAULT_BINDING_POWERS.ADDITIVE, `parseBinaryExpression`)
const SUBTRACTION = createBindParserEntry<DefaultParserProvider>(`led`, `dash`, DEFAULT_BINDING_POWERS.ADDITIVE, `parseBinaryExpression`)
const DIVISION = createBindParserEntry<DefaultParserProvider>(`led`, `slash`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, `parseBinaryExpression`)
const MULTIPLICATION = createBindParserEntry<DefaultParserProvider>(`led`, `asterisk`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, `parseBinaryExpression`)

// LITERALS/SYMBOLS
const NUMBER = createBindParserEntry<DefaultParserProvider>(`nud`, `number`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const STRING = createBindParserEntry<DefaultParserProvider>(`nud`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const STRING_STARTS_WITH_PERCENTAGE = createBindParserEntry<DefaultParserProvider>(`nud`, `percentage`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const CONCATENATE_WHITESPACE = createBindParserEntry<DefaultParserProvider>(`led`, `whitespace`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
const CONCATENATE_STRING = createBindParserEntry<DefaultParserProvider>(`led`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
// const IDENTIFIER = createBindParserEntry<DefaultParserProvider>(`nud`, `identifier`, DEFAULT_BINDING_POWERS.PRIMARY, 'parsePrimaryExpression')

// UNARY/PREFIX
const NEGATIVE = createBindParserEntry<DefaultParserProvider>(`nud`, `dash`, DEFAULT_BINDING_POWERS.PREFIX, `parsePrefixExpression`)
const POSITIVE = createBindParserEntry<DefaultParserProvider>(`nud`, `plus`, DEFAULT_BINDING_POWERS.PREFIX, `parsePrefixExpression`)

// MEMBER/CALL
const GCA_MEMBER = createBindParserEntry<DefaultParserProvider>(`led`, `double_colon`, DEFAULT_BINDING_POWERS.MEMBER, `parseMemberExpression`)
// const FUNCTION_NAME = createBindParserEntry<DefaultParserProvider>(`nud`, `identifier`, DEFAULT_BINDING_POWERS.MEMBER, `parseFunctionNameExpression`)
const CALL = createBindParserEntry<DefaultParserProvider>(`led`, `open_parenthesis`, DEFAULT_BINDING_POWERS.CALL, `parseCallExpression`)

// GROUPING
const PARENTHESIS = createBindParserEntry<DefaultParserProvider>(`nud`, `open_parenthesis`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const BRACES = createBindParserEntry<DefaultParserProvider>(`nud`, `open_braces`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const BRACKETS = createBindParserEntry<DefaultParserProvider>(`nud`, `open_brackets`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const QUOTES = createBindParserEntry<DefaultParserProvider>(`nud`, `quotes`, DEFAULT_BINDING_POWERS.GROUPING, `parseQuotedStringExpression`)

// STATEMENTS
const _IF = createBindParserEntry<DefaultParserProvider>(`nud`, `if`, DEFAULT_BINDING_POWERS.DEFAULT, `parseIfExpression`)

export const DEFAULT_GRAMMAR: SyntacticalGrammarEntry<DefaultParserProvider>[] = [
  ...createRegisterParserEntriesFromIndex(DEFAULT_PARSERS),

  // LOGICAL
  _AND,
  _OR,

  // RELATIONAL
  SMALLER,
  SMALLER_OR_EQUAL,
  GREATER,
  GREATER_OR_EQUAL,
  _EQUALS,
  NOT_EQUALS,

  // ADDITIVE/MULTIPLICATIVE
  ADDITION,
  SUBTRACTION,
  DIVISION,
  MULTIPLICATION,

  // LITERALS/SYMBOLS
  NUMBER,
  STRING,
  STRING_STARTS_WITH_PERCENTAGE,
  CONCATENATE_WHITESPACE,
  CONCATENATE_STRING,
  // IDENTIFIER,

  // UNARY/PREFIX
  NEGATIVE,
  POSITIVE,

  // MEMBER/CALL
  GCA_MEMBER,
  CALL,

  // GROUPING
  PARENTHESIS,
  BRACES,
  BRACKETS,
  QUOTES,

  // STATEMENTS
  _IF,
]
