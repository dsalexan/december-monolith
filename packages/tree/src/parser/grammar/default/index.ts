import { Entries } from "type-fest"

import { Match } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"

import { DEFAULT_BINDING_POWERS } from "./bindingPowers"
import { DEFAULT_PARSERS, DefaultParserProvider } from "./parsers"

export { DEFAULT_BINDING_POWERS } from "./bindingPowers"
export { DEFAULT_PARSERS } from "./parsers"

import { BindingPower } from "../bindingPower"
import {
  BindingPowerEntry,
  TransformNodeEntry,
  BindParserEntry,
  RegisterParserEntry,
  createBindParserEntry,
  createRegisterParserEntry,
  createRegisterParserEntriesFromIndex,
  SyntacticalGrammarEntry,
  createBindingPowerEntry,
} from "../entries"
import { LEDParser, NUDParser, ParserFunction, StatementParser, SyntacticalDenotation } from "../parserFunction"

import { TokenKind } from "../../../token"
import { NodeType } from "../../../tree"
import { parseStatement } from "./parsers/statement"
import { parseExpression } from "./parsers/expression"

// LOGICAL
const _AND = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `ampersand`, DEFAULT_BINDING_POWERS.LOGICAL, `parseBinaryExpression`)
const _OR = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `pipe`, DEFAULT_BINDING_POWERS.LOGICAL, `parseBinaryExpression`)

// RELATIONAL
const SMALLER = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `smaller`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const SMALLER_OR_EQUAL = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `smaller_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const GREATER = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `greater`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const GREATER_OR_EQUAL = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `greater_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const _EQUALS = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `equals`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const NOT_EQUALS = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `not_equals`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)

// ADDITIVE/MULTIPLICATIVE
const ADDITION = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `plus`, DEFAULT_BINDING_POWERS.ADDITIVE, `parseBinaryExpression`)
const SUBTRACTION = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `dash`, DEFAULT_BINDING_POWERS.ADDITIVE, `parseBinaryExpression`)
const DIVISION = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `slash`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, `parseBinaryExpression`)
const MULTIPLICATION = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `asterisk`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, `parseBinaryExpression`)
const EXPONENTIATION = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `caret`, DEFAULT_BINDING_POWERS.EXPONENTIATIVE, `parseBinaryExpression`)

// LITERALS/SYMBOLS
const NUMBER = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `number`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const STRING = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const STRING_STARTS_WITH_PERCENTAGE = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `percentage`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const CONCATENATE_WHITESPACE = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `whitespace`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
const CONCATENATE_STRING = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
const CONCATENATE_LITERAL_PERCENTAGE = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `percentage`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
const CONCATENATE_LITERAL_QUOTES = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `quotes`, DEFAULT_BINDING_POWERS.GROUPING, `parseConcatenatedQuotedStringExpression`)
// const IDENTIFIER = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `identifier`, DEFAULT_BINDING_POWERS.PRIMARY, 'parsePrimaryExpression')

// UNARY/PREFIX
const NEGATIVE = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `dash`, DEFAULT_BINDING_POWERS.PREFIX, `parsePrefixExpression`)
const POSITIVE = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `plus`, DEFAULT_BINDING_POWERS.PREFIX, `parsePrefixExpression`)

// MEMBER/CALL
const GCA_MEMBER = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `double_colon`, DEFAULT_BINDING_POWERS.MEMBER, `parseMemberExpression`)
// const FUNCTION_NAME = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `identifier`, DEFAULT_BINDING_POWERS.MEMBER, `parseFunctionNameExpression`)
const CALL = createBindParserEntry<DefaultParserProvider, TokenKind>(`led`, `open_parenthesis`, DEFAULT_BINDING_POWERS.CALL, `parseCallExpression`)

// GROUPING
const PARENTHESIS = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `open_parenthesis`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const BRACES = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `open_braces`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const BRACKETS = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `open_brackets`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const QUOTES = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `quotes`, DEFAULT_BINDING_POWERS.GROUPING, `parseQuotedStringExpression`)
const CLOSE_PARENTHESIS = createBindingPowerEntry(`nud`, `close_parenthesis`, DEFAULT_BINDING_POWERS.GROUPING)
const CLOSE_BRACES = createBindingPowerEntry(`nud`, `close_braces`, DEFAULT_BINDING_POWERS.GROUPING)
const CLOSE_BRACKETS = createBindingPowerEntry(`nud`, `close_brackets`, DEFAULT_BINDING_POWERS.GROUPING)

// STATEMENTS
const _IF = createBindParserEntry<DefaultParserProvider, TokenKind>(`nud`, `if`, DEFAULT_BINDING_POWERS.DEFAULT, `parseIfExpression`)

export const DEFAULT_GRAMMAR: SyntacticalGrammarEntry<DefaultParserProvider, TokenKind>[] = [
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
  EXPONENTIATION,
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
  CONCATENATE_LITERAL_PERCENTAGE,
  CONCATENATE_LITERAL_QUOTES,
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
  CLOSE_PARENTHESIS,
  CLOSE_BRACES,
  CLOSE_BRACKETS,

  // STATEMENTS
  _IF,
]
