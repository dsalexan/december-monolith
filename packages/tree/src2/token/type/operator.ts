import assert from "assert"
import TokenType, { EvaluateFunction } from "./base"
import type { TokenTypeName } from "."
import { TokenPattern, TokenPatternList } from "./pattern"
import { isNil } from "lodash"

// LOGICAL
export const _AND = new TokenType(`operator`, `and`, { type: `string`, value: `&` }, 1002)
export const _OR = new TokenType(`operator`, `or`, { type: `string`, value: `|` }, 1001)

// RELATIONAL
export const EQUALS = new TokenType(`operator`, `equals`, { type: `string`, value: `=` }, 1010)
export const GREATER = new TokenType(`operator`, `greater`, { type: `string`, value: `>` }, 1012)
export const SMALLER = new TokenType(`operator`, `smaller`, { type: `string`, value: `<` }, 1012)
export const GREATER_OR_EQUAL = new TokenType(`operator`, `greater_or_equal`, { type: `string`, value: `>=`, matchSequence: true }, 1011)
export const SMALLER_OR_EQUAL = new TokenType(`operator`, `smaller_or_equal`, { type: `string`, value: `<=`, matchSequence: true }, 1011)

// ALGEBRAIC
export const MULTIPLICATION = new TokenType(`operator`, `multiplication`, { type: `string`, value: `#` }, 10007)
export const DIVISION = new TokenType(`operator`, `division`, { type: `string`, value: `/` }, 10007)
export const ADDITION = new TokenType(`operator`, `addition`, { type: `string`, value: `+` }, 10005)
export const SUBTRACTION = new TokenType(`operator`, `subtraction`, { type: `string`, value: `-` }, 10005)

// export const BRACES = new TokenType(`braces`, { type: `list`, values: [`{`, `}`] }, 101)
// export const BRACKETS = new TokenType(`brackets`, { type: `list`, values: [`[`, `]`] }, 102)
// export const QUOTES = new TokenType(`quotes`, { type: `list`, values: [`"`, `"`] }, 103)
// export const PERCENTAGE = new TokenType(`percentage`, { type: `list`, values: [`%`, `%`] }, 104)

// WARN: Always update this list when adding a new recipe
export const LOGICAL_OPERATORS = [_AND, _OR]
export const LOGICAL_OPERATOR_NAMES = [`and`, `or`] as const
export type LogicalOperatorTokenTypeName = (typeof LOGICAL_OPERATOR_NAMES)[number]

export const RELATIONAL_OPERATORS = [EQUALS, GREATER, SMALLER, GREATER_OR_EQUAL, SMALLER_OR_EQUAL]
export const RELATIONAL_OPERATOR_NAMES = [`equals`, `greater`, `smaller`, `greater_or_equal`, `smaller_or_equal`] as const
export type RelationalOperatorTokenTypeName = (typeof RELATIONAL_OPERATOR_NAMES)[number]

export const ALGEBRAIC_OPERATORS = [MULTIPLICATION, DIVISION, ADDITION, SUBTRACTION]
export const ALGEBRAIC_OPERATOR_NAMES = [`multiplication`, `division`, `addition`, `subtraction`] as const
export type AlgebraicOperatorTokenTypeName = (typeof ALGEBRAIC_OPERATOR_NAMES)[number]

export const OPERATORS = [...LOGICAL_OPERATORS, ...RELATIONAL_OPERATORS, ...ALGEBRAIC_OPERATORS]
export const OPERATOR_NAMES = [...LOGICAL_OPERATOR_NAMES, ...RELATIONAL_OPERATOR_NAMES, ...ALGEBRAIC_OPERATOR_NAMES] as const
export type OperatorTokenTypeName = (typeof OPERATOR_NAMES)[number]

export const OPERATORS_BY_NAME = OPERATORS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
