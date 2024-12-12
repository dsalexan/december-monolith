import assert from "assert"

import type Parser from "../../.."

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../.."
import { BinaryExpression, CallExpression, Expression, ExpressionStatement, Identifier, MemberExpression, NumericLiteral, PrefixExpression, Statement, StringLiteral } from "../../../../tree"
import { TokenKindName } from "../../../../token/kind"
import type { SyntacticalContext } from "../../.."

/** Parse tokens into an expression (until we reach something below the minimum binding power) */
export function parseExpression(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  // 0. Here we NEVER, directly, advance the parser cursor

  let tokenKind = p.token(context).peek()

  // 1. Start of expression, there is no left context yet (so use NUD to determine left-context)
  const NUD = p.grammar.getParser(`nud`, tokenKind)
  assert(NUD, `No NUD parser for token kind "${tokenKind}"`)

  let left = NUD(p, context) // probably advances the cursor

  // 2. While current token has more binding power than treeBindingPower, keep LED parsing
  //      (i.e. only stop )
  while (p.token(context).has() && p.grammar.getBindingPower(p.token(context).peek())! > minimumBindingPower) {
    tokenKind = p.token(context).peek()
    if (tokenKind === `whitespace`) debugger

    const LED = p.grammar.getParser(`led`, tokenKind) // probably advances the cursor
    assert(LED, `No LED parser for token kind "${tokenKind}"`)

    left = LED(p, left, minimumBindingPower, context)
    // TODO: Concatenate strings should ACTUALLY be a loop, eating everything until a string is reached
  }

  return left
}

export function parsePrefixExpression(p: Parser, context: SyntacticalContext): Expression {
  const operator = p.token(context).next()
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.PREFIX, context)

  return new PrefixExpression(operator, right)
}

export function parseBinaryExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  const operator = p.token(context).next()
  const bindingPower = p.grammar.getBindingPower(operator.kind.name)!
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.DEFAULT, context)

  return new BinaryExpression(left, operator, right)
}

export function parseConcatenatedExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  const token = p.token(context).next()

  assert(left.type === `StringLiteral`, `Only string literals can have multiple tokens`)

  const stringLiteral = left as StringLiteral
  stringLiteral.values.push(token)

  return stringLiteral
}

export function parsePrimaryExpression(p: Parser, context: SyntacticalContext): Expression {
  const tokenKind = p.token(context).peek()

  if (tokenKind === `number`) {
    const token = p.token(context).next()
    const number = parseFloat(token.content)
    assert(!isNaN(number), `Invalid number "${number}"`)

    return new NumericLiteral(token)
  } else if (tokenKind === `string`) return new StringLiteral(p.token(context).next())
  else if (tokenKind === `whitespace`) return new StringLiteral(p.token(context).next())
  // else if (tokenKind === `identifier`) return new Identifier(p.token(context).next())

  throw new Error(`Invalid primary expression token kind "${tokenKind}"`)
}
export function parseMemberExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  p.token(context).next(`double_colon`)
  const token = p.token(context).next(`string`)
  return new MemberExpression(left, token)
}

export function parseGroupingExpression(p: Parser, context: SyntacticalContext): Expression {
  // 1. What are we eating?
  const tokenKind = p.token(context).peek()
  const [opener, closer]: [TokenKindName, TokenKindName] = tokenKind === `open_parenthesis` ? [`open_parenthesis`, `close_parenthesis`] : tokenKind === `quotes` ? [`quotes`, `quotes`] : ([null, null] as any)

  assert(opener, `Invalid grouping expression token kind "${tokenKind}"`)

  p.token(context).next(opener)
  const expression = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.DEFAULT, context)
  p.token(context).next(closer)

  return expression
}

export function parseCallExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  // 1. What are we eating?
  debugger
  p.token(context).next()
  const args: Expression[] = []

  // 2. Look until we eat a )
  while (p.token(context).has() && p.token(context).peek() !== `close_parenthesis`) {
    // 3. Parse everything above ASSIGNMENT (anything below it is a COMMA)
    const arg = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.ASSIGNMENT, context)
    args.push(arg)

    // 4. Eat a comma (if there is one, should have unless e are at the close_paren)
    if (p.token(context).peek() !== `close_parenthesis`) p.token(context).next(`comma`)
  }

  p.token(context).next(`close_parenthesis`)

  return new CallExpression(left, args)
}
