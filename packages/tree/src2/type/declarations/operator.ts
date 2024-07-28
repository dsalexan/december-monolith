import assert from "assert"
import Type from "../base"
import * as Pattern from "../../pattern"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const OPERATOR_PRIORITY = 1000

// LOGICAL
export const _OR = new Type(`operator`, `or`, `|`).addLexical(OPERATOR_PRIORITY + 102, Pattern.STRING(`|`)).deriveSyntactical(2)
export const _AND = new Type(`operator`, `and`, `$`).addLexical(OPERATOR_PRIORITY + 101, Pattern.STRING(`&`)).deriveSyntactical(2)

// RELATIONAL
export const EQUALS = new Type(`operator`, `equals`, `=`).addLexical(OPERATOR_PRIORITY + 15, Pattern.STRING(`=`)).deriveSyntactical(2)
export const GREATER_OR_EQUAL = new Type(`operator`, `greater_or_equal`, `>=`).addLexical(OPERATOR_PRIORITY + 12, Pattern.STRING(`>=`)).deriveSyntactical(2)
export const SMALLER_OR_EQUAL = new Type(`operator`, `smaller_or_equal`, `<=`).addLexical(OPERATOR_PRIORITY + 12, Pattern.STRING(`<=`)).deriveSyntactical(2)
export const GREATER = new Type(`operator`, `greater`, `>`).addLexical(OPERATOR_PRIORITY + 11, Pattern.STRING(`>`)).deriveSyntactical(2)
export const SMALLER = new Type(`operator`, `smaller`, `<`).addLexical(OPERATOR_PRIORITY + 11, Pattern.STRING(`<`)).deriveSyntactical(2)

// ALGEBRAIC
export const MULTIPLICATION = new Type(`operator`, `multiplication`, `×`).addLexical(OPERATOR_PRIORITY + 7, Pattern.STRING(`#`)).deriveSyntactical(2)
export const DIVISION = new Type(`operator`, `division`, `÷`).addLexical(OPERATOR_PRIORITY + 7, Pattern.STRING(`/`)).deriveSyntactical(2)
export const ADDITION = new Type(`operator`, `addition`, `+`).addLexical(OPERATOR_PRIORITY + 5, Pattern.STRING(`+`)).deriveSyntactical(2)
export const SUBTRACTION = new Type(`operator`, `subtraction`, `-`).addLexical(OPERATOR_PRIORITY + 5, Pattern.STRING(`-`)).deriveSyntactical(2)

// WARN: Always update this list when adding a new recipe
export const LOGICAL_OPERATORS = [_AND, _OR]
export const LOGICAL_OPERATOR_NAMES = [`and`, `or`] as const
export type LogicalOperatorTypeName = (typeof LOGICAL_OPERATOR_NAMES)[number]

export const RELATIONAL_OPERATORS = [EQUALS, GREATER, SMALLER, GREATER_OR_EQUAL, SMALLER_OR_EQUAL]
export const RELATIONAL_OPERATOR_NAMES = [`equals`, `greater`, `smaller`, `greater_or_equal`, `smaller_or_equal`] as const
export type RelationalOperatorTypeName = (typeof RELATIONAL_OPERATOR_NAMES)[number]

export const ALGEBRAIC_OPERATORS = [MULTIPLICATION, DIVISION, ADDITION, SUBTRACTION]
export const ALGEBRAIC_OPERATOR_NAMES = [`multiplication`, `division`, `addition`, `subtraction`] as const
export type AlgebraicOperatorTypeName = (typeof ALGEBRAIC_OPERATOR_NAMES)[number]

export const OPERATORS = [...LOGICAL_OPERATORS, ...RELATIONAL_OPERATORS, ...ALGEBRAIC_OPERATORS]
export const OPERATOR_NAMES = [...LOGICAL_OPERATOR_NAMES, ...RELATIONAL_OPERATOR_NAMES, ...ALGEBRAIC_OPERATOR_NAMES] as const
export type OperatorTypeName = (typeof OPERATOR_NAMES)[number]

export const OPERATORS_BY_NAME = OPERATORS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})
