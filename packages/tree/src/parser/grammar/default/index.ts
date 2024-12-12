import { BindingPower, BoundParser, SyntacticalParser, SyntacticalParserType } from ".."
import { TokenKindName } from "../../../token/kind"

import { DEFAULT_BINDING_POWERS } from "./bindingPowers"
import { DEFAULT_PARSERS } from "./parsers"

export { DEFAULT_BINDING_POWERS } from "./bindingPowers"
export { DEFAULT_PARSERS } from "./parsers"

/** Creates a bound parser (well, type + bindingPower + syntacticalParserFunction) */
export function createBindingHandler<TParser extends SyntacticalParser>(type: SyntacticalParserType, tokenKind: TokenKindName, bindingPower: BindingPower, parser: TParser): BoundParser<TParser> & { tokenKind: TokenKindName } {
  return { type, bindingPower, parser, tokenKind }
}

// LOGICAL
const _AND = createBindingHandler(`led`, `ampersand`, DEFAULT_BINDING_POWERS.LOGICAL, DEFAULT_PARSERS.parseBinaryExpression)
const _OR = createBindingHandler(`led`, `pipe`, DEFAULT_BINDING_POWERS.LOGICAL, DEFAULT_PARSERS.parseBinaryExpression)

// RELATIONAL
const SMALLER = createBindingHandler(`led`, `smaller`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const SMALLER_OR_EQUAL = createBindingHandler(`led`, `smaller_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const GREATER = createBindingHandler(`led`, `greater`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const GREATER_OR_EQUAL = createBindingHandler(`led`, `greater_or_equal`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const EQUALS = createBindingHandler(`led`, `equals`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)
const NOT_EQUALS = createBindingHandler(`led`, `not_equals`, DEFAULT_BINDING_POWERS.RELATIONAL, DEFAULT_PARSERS.parseBinaryExpression)

// ADDITIVE/MULTIPLICATIVE
const ADDITION = createBindingHandler(`led`, `plus`, DEFAULT_BINDING_POWERS.ADDITIVE, DEFAULT_PARSERS.parseBinaryExpression)
const SUBTRACTION = createBindingHandler(`led`, `dash`, DEFAULT_BINDING_POWERS.ADDITIVE, DEFAULT_PARSERS.parseBinaryExpression)
const DIVISION = createBindingHandler(`led`, `slash`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, DEFAULT_PARSERS.parseBinaryExpression)
const MULTIPLICATION = createBindingHandler(`led`, `asterisk`, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, DEFAULT_PARSERS.parseBinaryExpression)

// LITERALS/SYMBOLS
const NUMBER = createBindingHandler(`nud`, `number`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parsePrimaryExpression)
const STRING = createBindingHandler(`nud`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parsePrimaryExpression)
const CONCATENATE_WHITESPACE = createBindingHandler(`led`, `whitespace`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parseConcatenatedExpression)
const CONCATENATE_STRING = createBindingHandler(`led`, `string`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parseConcatenatedExpression)
// const IDENTIFIER = createBindingHandler(`nud`, `identifier`, DEFAULT_BINDING_POWERS.PRIMARY, DEFAULT_PARSERS.parsePrimaryExpression)

// UNARY/PREFIX
const NEGATIVE = createBindingHandler(`nud`, `dash`, DEFAULT_BINDING_POWERS.PREFIX, DEFAULT_PARSERS.parsePrefixExpression)
const POSITIVE = createBindingHandler(`nud`, `plus`, DEFAULT_BINDING_POWERS.PREFIX, DEFAULT_PARSERS.parsePrefixExpression)

// MEMBER/CALL
const GCA_MEMBER = createBindingHandler(`led`, `double_colon`, DEFAULT_BINDING_POWERS.MEMBER, DEFAULT_PARSERS.parseMemberExpression)
const CALL = createBindingHandler(`led`, `open_parenthesis`, DEFAULT_BINDING_POWERS.CALL, DEFAULT_PARSERS.parseCallExpression)

// GROUPING
const PARENTHESIS = createBindingHandler(`nud`, `open_parenthesis`, DEFAULT_BINDING_POWERS.DEFAULT, DEFAULT_PARSERS.parseGroupingExpression)
const QUOTES = createBindingHandler(`nud`, `quotes`, DEFAULT_BINDING_POWERS.DEFAULT, DEFAULT_PARSERS.parseGroupingExpression)

// STATEMENTS
const _IF = createBindingHandler(`statement`, `if`, DEFAULT_BINDING_POWERS.DEFAULT, DEFAULT_PARSERS.parseIfStatement)

export const DEFAULT_GRAMMAR = [
  // LOGICAL
  _AND,
  _OR,

  // RELATIONAL
  SMALLER,
  SMALLER_OR_EQUAL,
  GREATER,
  GREATER_OR_EQUAL,
  EQUALS,
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
  QUOTES,

  // STATEMENTS
  _IF,
]
export const DEFAULT_PARSE_EXPRESSION = DEFAULT_PARSERS.parseExpression
export const DEFAULT_PARSE_STATEMENT = DEFAULT_PARSERS.parseStatement
