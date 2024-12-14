import { Match } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"

import { DEFAULT_BINDING_POWERS } from "./bindingPowers"
import { DEFAULT_PARSERS, DefaultParserFunctionIndex } from "./parsers"

export { DEFAULT_BINDING_POWERS } from "./bindingPowers"
export { DEFAULT_PARSERS } from "./parsers"

import { BindingPower } from "../bindingPower"
import { BindingPowerEntry, ReTyperEntry, BindParserEntry, RegisterParserEntry, createBindParserEntry, createRegisterParserEntry, createRegisterParserEntriesFromIndex, SyntacticalGrammarEntry } from "../entries"
import { LEDParser, NUDParser, ParserFunction, ParserFunctionIndex, StatementParser, SyntacticalDenotation } from "../parserFunction"

import { TokenKindName } from "../../../token/kind"
import { NodeType } from "../../../tree"
import { parseStatement } from "./parsers/statement"
import { parseExpression } from "./parsers/expression"
import { Entries } from "type-fest"

// LOGICAL
const _AND = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `ampersand`, DEFAULT_BINDING_POWERS.LOGICAL, `parseBinaryExpression`)
const _OR = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `pipe`, DEFAULT_BINDING_POWERS.LOGICAL, `parseBinaryExpression`)

// RELATIONAL
const SMALLER = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `smaller`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const SMALLER_OR_EQUAL = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `smaller_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const GREATER = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `greater`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const GREATER_OR_EQUAL = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `greater_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const _EQUALS = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `equals`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)
const NOT_EQUALS = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `not_equals`, DEFAULT_BINDING_POWERS.RELATIONAL, `parseBinaryExpression`)

// ADDITIVE/MULTIPLICATIVE
const ADDITION = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `plus`, DEFAULT_BINDING_POWERS.ADDITIVE, `parseBinaryExpression`)
const SUBTRACTION = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `dash`, DEFAULT_BINDING_POWERS.ADDITIVE, `parseBinaryExpression`)
const DIVISION = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `slash`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, `parseBinaryExpression`)
const MULTIPLICATION = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `asterisk`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, `parseBinaryExpression`)

// LITERALS/SYMBOLS
const NUMBER = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `number`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const STRING = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, `parsePrimaryExpression`)
const CONCATENATE_WHITESPACE = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `whitespace`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
const CONCATENATE_STRING = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, `parseConcatenatedExpression`)
// const IDENTIFIER = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `identifier`, DEFAULT_BINDING_POWERS.PRIMARY, 'parsePrimaryExpression')

// UNARY/PREFIX
const NEGATIVE = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `dash`, DEFAULT_BINDING_POWERS.PREFIX, `parsePrefixExpression`)
const POSITIVE = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `plus`, DEFAULT_BINDING_POWERS.PREFIX, `parsePrefixExpression`)

// MEMBER/CALL
const GCA_MEMBER = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `double_colon`, DEFAULT_BINDING_POWERS.MEMBER, `parseMemberExpression`)
const CALL = createBindParserEntry<DefaultParserFunctionIndex>(`led`, `open_parenthesis`, DEFAULT_BINDING_POWERS.CALL, `parseCallExpression`)

// GROUPING
const PARENTHESIS = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `open_parenthesis`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const BRACES = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `open_braces`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const BRACKETS = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `open_brackets`, DEFAULT_BINDING_POWERS.GROUPING, `parseGroupingExpression`)
const QUOTES = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `quotes`, DEFAULT_BINDING_POWERS.GROUPING, `parseQuotedStringExpression`)

// STATEMENTS
const _IF = createBindParserEntry<DefaultParserFunctionIndex>(`nud`, `if`, DEFAULT_BINDING_POWERS.DEFAULT, `parseIfExpression`)

export const DEFAULT_GRAMMAR: SyntacticalGrammarEntry<DefaultParserFunctionIndex>[] = [
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
