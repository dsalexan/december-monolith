import assert from "assert"

import type Parser from "../../.."
import { BinaryExpression, CallExpression, Expression, ExpressionStatement, Identifier, MemberExpression, NumericLiteral, PrefixExpression, Statement, StringLiteral, UnitLiteral } from "../../../../tree"
import { TokenKind, getTokenKind, TokenKindName } from "../../../../token/kind"

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../../bindingPower"
import { SyntacticalContext, SyntaxMode } from "../../parserFunction"
import { ArtificialToken } from "../../../../token/core"

/** Parse tokens into an expression (until we reach something below the minimum binding power) */
export function parseExpression(p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  // 0. Here we NEVER, directly, advance the parser cursor

  let tokenKind = p.peek()
  while (p.peek() === `whitespace`) tokenKind = p.next() && p.peek() // REFACTOR: Do better

  // 1. Start of expression, there is no left context yet (so use NUD to determine left-context)
  const NUD = p.grammar.getParser(`nud`, tokenKind)
  assert(NUD, `No NUD parser for token kind "${tokenKind}"`)

  let left = NUD(p, context) // probably advances the cursor

  // 2. While current token has more binding power than treeBindingPower, keep LED parsing
  //      (i.e. only stop )
  while (p.hasTokens() && p.grammar.getBindingPower(p.peek(), `led`)! > minimumBindingPower) {
    tokenKind = p.peek()

    // SPECIAL CASE FOR PARSING: whitespace x SyntaxMode
    if (tokenKind === `whitespace`) {
      const skipWhitespace = context.mode === `expression`
      const canGlueStrings = left.type === `StringLiteral` && [`string`, `whitespace`].includes(p.peek(1))
      if (skipWhitespace && !canGlueStrings) {
        p.next()
        continue
      }
    }

    const LED = p.grammar.getParser(`led`, tokenKind) // probably advances the cursor
    assert(LED, `No LED parser for token kind "${tokenKind}"`)

    left = LED(p, left, minimumBindingPower, context)
    // TODO: Concatenate strings should ACTUALLY be a loop, eating everything until a string is reached
  }

  return left
}

export function parsePrefixExpression(p: Parser, context: SyntacticalContext): Expression {
  const operator = p.next()
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.PREFIX, context)

  return new PrefixExpression(operator, right)
}

export function parseBinaryExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  const operator = p.next()
  const bindingPower = p.grammar.getBindingPower(operator.kind.name, `led`)!
  const right = p.grammar.parseExpression(p, bindingPower, context)

  return new BinaryExpression(left, operator, right)
}

export function parseConcatenatedExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  if (left.type === `NumericLiteral`) return parseImplicitMultiplication(p, left, minimumBindingPower, context)

  assert(left.type === `StringLiteral`, `Only string literals can have multiple tokens (found "${left.type}")`)
  const stringLiteral = left as StringLiteral

  // 2. Eat string and whitespace tokens
  while (p.hasTokens() && [`string`, `whitespace`].includes(p.peek())) {
    const token = p.next()
    stringLiteral.values.push(token)
  }

  return stringLiteral
}

export function parseImplicitMultiplication(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  const numericLiteral = left as NumericLiteral
  const operator = new ArtificialToken(getTokenKind(`asterisk`), `*`)
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, context)

  return new BinaryExpression(numericLiteral, operator, right)
}

export function parsePrimaryExpression(p: Parser, context: SyntacticalContext): Expression {
  const tokenKind = p.peek()

  if (tokenKind === `number`) {
    const token = p.next()
    const number = parseFloat(token.content)
    assert(!isNaN(number), `Invalid number "${number}"`)

    return new NumericLiteral(token)
  } else if (tokenKind === `string`) return parseStringExpression(p, new StringLiteral(p.next()), context)
  // else if (tokenKind === `identifier`) return new Identifier(p.next())

  throw new Error(`Invalid primary expression token kind "${tokenKind}"`)
}

export function parseMemberExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  p.next(`double_colon`)
  const token = p.next(`string`)
  return new MemberExpression(left, token)
}

export function parseQuotedStringExpression(p: Parser, context: SyntacticalContext): Expression {
  p.next(`quotes`)

  // 1. Start literal with fist token
  const stringLiteral = new StringLiteral(p.next())

  // 2. Eat string and whitespace tokens
  while (p.hasTokens() && p.peek() !== `quotes`) {
    const token = p.next()
    stringLiteral.values.push(token)
  }

  p.next(`quotes`)

  return parseStringExpression(p, stringLiteral, context)
}

export function parseStringExpression(p: Parser, stringLiteral: StringLiteral, context: SyntacticalContext): Expression {
  // if stringLiteral is a identifier (create lookup identifier), re-create node as Identifier

  const content = stringLiteral.getContent()

  const identifierTest = p.grammar.isIdentifier(content)
  if (identifierTest?.isMatch) return new Identifier(...stringLiteral.values)

  const unit = p.grammar.getUnit(content)
  if (unit) return new UnitLiteral(unit, ...stringLiteral.values)

  return stringLiteral
}

export function parseGroupingExpression(p: Parser, context: SyntacticalContext): Expression {
  // 1. What are we eating?
  const tokenKind = p.peek()
  const [opener, closer]: [TokenKindName, TokenKindName] =
    tokenKind === `open_parenthesis` ? [`open_parenthesis`, `close_parenthesis`] : tokenKind === `open_braces` ? [`open_braces`, `close_braces`] : tokenKind === `open_brackets` ? [`open_brackets`, `close_brackets`] : ([null, null] as any)

  assert(opener, `Invalid grouping expression token kind "${tokenKind}"`)

  const mode: SyntaxMode = opener === `quotes` ? `string` : context.mode

  p.next(opener)
  const expression = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.GROUPING, { ...context, mode })
  p.next(closer)

  return expression
}

export function parseCallExpression(p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression {
  // 1. What are we eating?
  p.next()
  const args: Expression[] = []

  // 2. Look until we eat a )
  while (p.hasTokens() && p.peek() !== `close_parenthesis`) {
    // 3. Parse everything above ASSIGNMENT (anything below it is a COMMA)
    const arg = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.ASSIGNMENT, context)
    args.push(arg)

    // 4. Eat a comma (if there is one, should have unless e are at the close_paren)
    if (p.peek() !== `close_parenthesis`) p.next(`comma`)
  }

  p.next(`close_parenthesis`)

  return new CallExpression(left, args)
}
