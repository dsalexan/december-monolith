import { MaybeUndefined } from "tsdef"

import type Parser from "../../.."
import { Expression, ExpressionStatement, Statement, IfExpression } from "../../../../tree"

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../../bindingPower"

import { EntryParser, StatementParser, SyntacticalContext } from "../../parserFunction"

export const parseStatement: EntryParser<Statement> = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Statement => {
  const parse = p.grammar.getParser(`statement`, p.peek())
  if (parse) return parse(p, context)

  if (minimumBindingPower !== DEFAULT_BINDING_POWERS.DEFAULT) debugger

  const parseExpressionStatement = p.grammar.call<DefaultStatementParserFunctionIndex, `parseExpressionStatement`>(`parseExpressionStatement`)
  return parseExpressionStatement(p, minimumBindingPower, context)
}

export const parseExpressionStatement: EntryParser<Statement> = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): ExpressionStatement => {
  const expression = p.grammar.parseExpression(p, minimumBindingPower, context)
  // p.next(`semi_colon`) // NOT A THING HERE

  return new ExpressionStatement(expression)
}

export const DEFAULT_STATEMENT_PARSERS = {
  parseStatement,
  parseExpressionStatement,
} as const
export type DefaultStatementParserFunctionIndex = typeof DEFAULT_STATEMENT_PARSERS
