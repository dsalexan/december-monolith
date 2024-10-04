import assert from "assert"

import { EQUALS as _EQUALS, IS_ELEMENT_OF, IsElementOfSetPattern } from "@december/utils/match/element"

import Type from "../base"

import { arityInOrder } from "../../node/traversal"

/**
 * Lower Priority means less nodes can be parent of this node
 *    ROOT has the lowest priority, so no other node can be parent of it
 * Higher Priority means less nodes can be children of this node
 *    OPERANDS have the highest priority, so no other node can be children of it
 */

const OPERATOR_PRIORITY = 10 ** 6

// LOGICAL
export const _OR = new Type(`operator`, `or`, `|`)
  .addLexical(OPERATOR_PRIORITY + 102, _EQUALS(`|`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const _AND = new Type(`operator`, `and`, `$`)
  .addLexical(OPERATOR_PRIORITY + 101, _EQUALS(`&`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)

// RELATIONAL
export const EQUALS = new Type(`operator`, `equals`, `=`, [`logical`])
  .addLexical(OPERATOR_PRIORITY + 5, _EQUALS(`=`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const GREATER_OR_EQUAL = new Type(`operator`, `greater_or_equal`, `>=`, [`logical`])
  .addLexical(OPERATOR_PRIORITY + 2, _EQUALS(`>=`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const SMALLER_OR_EQUAL = new Type(`operator`, `smaller_or_equal`, `<=`, [`logical`])
  .addLexical(OPERATOR_PRIORITY + 2, _EQUALS(`<=`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const GREATER = new Type(`operator`, `greater`, `>`, [`logical`])
  .addLexical(OPERATOR_PRIORITY + 1, _EQUALS(`>`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const SMALLER = new Type(`operator`, `smaller`, `<`, [`logical`])
  .addLexical(OPERATOR_PRIORITY + 1, _EQUALS(`<`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)

// ALGEBRAIC
export const MULTIPLICATION = new Type(`operator`, `multiplication`, `×`, [`arithmetic`])
  .addLexical(OPERATOR_PRIORITY + 17, _EQUALS(`*`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const DIVISION = new Type(`operator`, `division`, `÷`, [`arithmetic`])
  .addLexical(OPERATOR_PRIORITY + 17, _EQUALS(`/`))
  .deriveSyntactical(2)
  .setInOrderBehaviour(arityInOrder)
export const ADDITION = new Type(`operator`, `addition`, `+`, [`arithmetic`])
  .addLexical(OPERATOR_PRIORITY + 15, _EQUALS(`+`))
  .deriveSyntactical(2, { incompleteArity: true })
  .setInOrderBehaviour(arityInOrder)
export const SUBTRACTION = new Type(`operator`, `subtraction`, `-`, [`arithmetic`])
  .addLexical(OPERATOR_PRIORITY + 15, _EQUALS(`-`))
  .deriveSyntactical(2, { incompleteArity: true })
  .setInOrderBehaviour(arityInOrder)

export const SIGN = new Type(`operator`, `sign`, `g`, [`arithmetic`, `numeric`, `quantity:numerical-value`, `literal:like`]) //
  .addSyntactical(OPERATOR_PRIORITY + 19, 1)
  .setInOrderBehaviour(arityInOrder)

// WARN: Always update this list when adding a new recipe
export const LOGICAL_OPERATORS = [_AND, _OR]
export const LOGICAL_OPERATOR_NAMES = [`and`, `or`] as const
export type LogicalOperatorTypeName = (typeof LOGICAL_OPERATOR_NAMES)[number]

export const RELATIONAL_OPERATORS = [EQUALS, GREATER, SMALLER, GREATER_OR_EQUAL, SMALLER_OR_EQUAL]
export const RELATIONAL_OPERATOR_NAMES = [`equals`, `greater`, `smaller`, `greater_or_equal`, `smaller_or_equal`] as const
export type RelationalOperatorTypeName = (typeof RELATIONAL_OPERATOR_NAMES)[number]

export const ALGEBRAIC_OPERATORS = [MULTIPLICATION, DIVISION, ADDITION, SUBTRACTION, SIGN]
export const ALGEBRAIC_OPERATOR_NAMES = [`multiplication`, `division`, `addition`, `subtraction`, `sign`] as const
export type AlgebraicOperatorTypeName = (typeof ALGEBRAIC_OPERATOR_NAMES)[number]

export const OPERATORS = [...LOGICAL_OPERATORS, ...RELATIONAL_OPERATORS, ...ALGEBRAIC_OPERATORS]
export type OperatorType = (typeof OPERATORS)[number]
export const OPERATOR_NAMES = [...LOGICAL_OPERATOR_NAMES, ...RELATIONAL_OPERATOR_NAMES, ...ALGEBRAIC_OPERATOR_NAMES] as const
export type OperatorTypeName = (typeof OPERATOR_NAMES)[number]

export const OPERATORS_BY_NAME = OPERATORS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

export const DEFAULT_OPERATORS = [...LOGICAL_OPERATORS, ...RELATIONAL_OPERATORS]
export const MATH_OPERATORS = [...ALGEBRAIC_OPERATORS]
