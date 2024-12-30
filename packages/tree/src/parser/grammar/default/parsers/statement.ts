import { MaybeUndefined } from "tsdef"

import type Parser from "../../.."
import { Expression, ExpressionStatement, Statement, IfExpression } from "../../../../tree"

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../../bindingPower"

import { EntryParser, StatementParser, SyntacticalContext } from "../../parserFunction"
import type { DefaultExpressionParserProvider } from "./expression"

export const parseStatement: EntryParser<Statement> = (p: Parser<DefaultStatementParserProvider>, minimumBindingPower: BindingPower, context: SyntacticalContext): Statement => {
  const parse = p.grammar.getParser(`statement`, p.peek(), p.before())
  if (parse) return parse(p, context)

  if (minimumBindingPower !== DEFAULT_BINDING_POWERS.DEFAULT) debugger

  return p.grammar.call(`parseExpressionStatement`)(p, minimumBindingPower, context)
}

export const parseExpressionStatement: EntryParser<Statement> = (p: Parser<DefaultExpressionParserProvider>, minimumBindingPower: BindingPower, context: SyntacticalContext): ExpressionStatement => {
  let expression: Expression

  if (context.mode === `expression`) expression = p.grammar.parseExpression(p, minimumBindingPower, context)
  else if (context.mode === `if`) expression = p.grammar.call(`parseIfExpression`)(p, context) as IfExpression
  //
  else throw new Error(`Invalid context mode "${context.mode}"`)
  // p.next(`semi_colon`) // NOT A THING HERE

  // @ts-ignore
  return new ExpressionStatement(expression)
}

export const DEFAULT_STATEMENT_PARSERS = {
  parseStatement,
  parseExpressionStatement,
}
export type DefaultStatementParserProvider = typeof DEFAULT_STATEMENT_PARSERS
