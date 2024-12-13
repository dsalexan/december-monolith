import { Match } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"

import { DEFAULT_BINDING_POWERS } from "./bindingPowers"
import { DEFAULT_PARSERS } from "./parsers"

export { DEFAULT_BINDING_POWERS } from "./bindingPowers"
export { DEFAULT_PARSERS } from "./parsers"

import { BindingPower, BindingPowerEntry, IdentifierEntry, ParserFunctionEntry } from ".."
import { LEDParser, NUDParser, ParserFunction, StatementParser, SyntacticalDenotation } from "../parserFunction"
import { TokenKindName } from "../../../token/kind"

export const createBindingPowerEntry = (denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower): BindingPowerEntry => ({ denotation, kind, bindingPower })

export const createIdentifierEntry = (key: string, pattern: Match.Pattern): IdentifierEntry => ({ key, pattern })

export function createParserFunctionEntry(denotation: `statement`, kind: TokenKindName, bindingPower: BindingPower, parser: StatementParser): ParserFunctionEntry
export function createParserFunctionEntry(denotation: `nud`, kind: TokenKindName, bindingPower: BindingPower, parser: NUDParser): ParserFunctionEntry
export function createParserFunctionEntry(denotation: `led`, kind: TokenKindName, bindingPower: BindingPower, parser: LEDParser): ParserFunctionEntry
export function createParserFunctionEntry(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower, parser: ParserFunction): ParserFunctionEntry {
  return { denotation, kind, bindingPower, parser }
}

// LOGICAL
const _AND = createParserFunctionEntry(`led`, `ampersand`, DEFAULT_BINDING_POWERS.LOGICAL, DEFAULT_PARSERS.parseBinaryExpression)
const _OR = createParserFunctionEntry(`led`, `pipe`, DEFAULT_BINDING_POWERS.LOGICAL, DEFAULT_PARSERS.parseBinaryExpression)

// RELATIONAL
const SMALLER = createParserFunctionEntry(`led`, `smaller`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const SMALLER_OR_EQUAL = createParserFunctionEntry(`led`, `smaller_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const GREATER = createParserFunctionEntry(`led`, `greater`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const GREATER_OR_EQUAL = createParserFunctionEntry(`led`, `greater_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const _EQUALS = createParserFunctionEntry(`led`, `equals`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const NOT_EQUALS = createParserFunctionEntry(`led`, `not_equals`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)

// ADDITIVE/MULTIPLICATIVE
const ADDITION = createParserFunctionEntry(`led`, `plus`, DEFAULT_BINDING_POWERS.ADDITIVE, DEFAULT_PARSERS.parseBinaryExpression)
const SUBTRACTION = createParserFunctionEntry(`led`, `dash`, DEFAULT_BINDING_POWERS.ADDITIVE, DEFAULT_PARSERS.parseBinaryExpression)
const DIVISION = createParserFunctionEntry(`led`, `slash`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, DEFAULT_PARSERS.parseBinaryExpression)
const MULTIPLICATION = createParserFunctionEntry(`led`, `asterisk`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, DEFAULT_PARSERS.parseBinaryExpression)

// LITERALS/SYMBOLS
const NUMBER = createParserFunctionEntry(`nud`, `number`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parsePrimaryExpression)
const STRING = createParserFunctionEntry(`nud`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parsePrimaryExpression)
const CONCATENATE_WHITESPACE = createParserFunctionEntry(`led`, `whitespace`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parseConcatenatedExpression)
const CONCATENATE_STRING = createParserFunctionEntry(`led`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parseConcatenatedExpression)
// const IDENTIFIER = createParserFunctionEntry(`nud`, `identifier`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parsePrimaryExpression)

// UNARY/PREFIX
const NEGATIVE = createParserFunctionEntry(`nud`, `dash`, DEFAULT_BINDING_POWERS.PREFIX, DEFAULT_PARSERS.parsePrefixExpression)
const POSITIVE = createParserFunctionEntry(`nud`, `plus`, DEFAULT_BINDING_POWERS.PREFIX, DEFAULT_PARSERS.parsePrefixExpression)

// MEMBER/CALL
const GCA_MEMBER = createParserFunctionEntry(`led`, `double_colon`, DEFAULT_BINDING_POWERS.MEMBER, DEFAULT_PARSERS.parseMemberExpression)
const CALL = createParserFunctionEntry(`led`, `open_parenthesis`, DEFAULT_BINDING_POWERS.CALL, DEFAULT_PARSERS.parseCallExpression)

// GROUPING
const PARENTHESIS = createParserFunctionEntry(`nud`, `open_parenthesis`, DEFAULT_BINDING_POWERS.GROUPING, DEFAULT_PARSERS.parseGroupingExpression)
const BRACES = createParserFunctionEntry(`nud`, `open_braces`, DEFAULT_BINDING_POWERS.GROUPING, DEFAULT_PARSERS.parseGroupingExpression)
const BRACKETS = createParserFunctionEntry(`nud`, `open_brackets`, DEFAULT_BINDING_POWERS.GROUPING, DEFAULT_PARSERS.parseGroupingExpression)
const QUOTES = createParserFunctionEntry(`nud`, `quotes`, DEFAULT_BINDING_POWERS.GROUPING, DEFAULT_PARSERS.parseQuotedStringExpression)

// STATEMENTS
const _IF = createParserFunctionEntry(`statement`, `if`, DEFAULT_BINDING_POWERS.DEFAULT, DEFAULT_PARSERS.parseIfStatement)

// IDENTIFIERS
const IDENTIFIERS = []

export const DEFAULT_GRAMMAR = [
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

  // IDENTIFIERS
  ...IDENTIFIERS,
]

export const DEFAULT_PARSE_EXPRESSION = DEFAULT_PARSERS.parseExpression
export const DEFAULT_PARSE_STATEMENT = DEFAULT_PARSERS.parseStatement
