import type Parser from "../../.."

import { Expression, ExpressionStatement, Statement } from "../../../../tree"

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { IfStatement } from "../../../../tree/statement"
import { MaybeUndefined } from "tsdef"
import { BindingPower } from "../.."
import type { SyntacticalContext } from "../../.."

export function parseStatement(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Statement {
  const parse = p.grammar.getParser(`statement`, p.token(context).peek())
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
  debugger
  p.token(context).next(`open_parenthesis`)

  const condition = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.COMMA, context)
  debugger
  p.token(context).next(`then`)
  const consequent = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.COMMA, context)

  let alternative: MaybeUndefined<Expression> = undefined
  if (p.token(context).peek() === `else`) {
    p.token(context).next(`else`)
    alternative = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.DEFAULT, context)
  }

  p.token(context).next(`close_parenthesis`)

  debugger
  return new IfStatement(condition, consequent, alternative)
}
