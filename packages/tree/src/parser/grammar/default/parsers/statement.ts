import { MaybeUndefined } from "tsdef"

import type Parser from "../../.."
import { Expression, ExpressionStatement, Statement } from "../../../../tree"
import { IfStatement } from "../../../../tree/statement"

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../../bindingPower"
import { SyntacticalContext } from "../../parserFunction"

export function parseStatement(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Statement {
  const parse = p.grammar.getParser(`statement`, p.peek())
  if (parse) return parse(p, context)

  return parseExpressionStatement(p, minimumBindingPower, context)
}

export function parseExpressionStatement(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): ExpressionStatement {
  const expression = p.grammar.parseExpression(p, minimumBindingPower, context)
  // p.next(`semi_colon`) // NOT A THING HERE

  return new ExpressionStatement(expression)
}

// @if(<condition> then <consequent> else <alternative>)
export function parseIfStatement(p: Parser, context: SyntacticalContext): Statement {
  p.next(`if`)
  p.next(`open_parenthesis`)
  const condition = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.COMMA, context)

  p.next(`then`)
  const consequent = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.COMMA, context)

  let alternative: MaybeUndefined<Expression> = undefined
  if (p.peek() === `whitespace`) debugger // ERROR: Untested
  if (p.peek() === `else`) {
    p.next(`else`)
    alternative = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.DEFAULT, context)
  }

  if (p.peek() === `whitespace`) debugger // ERROR: Untested
  p.next(`close_parenthesis`)

  return new IfStatement(condition, consequent, alternative)
}
