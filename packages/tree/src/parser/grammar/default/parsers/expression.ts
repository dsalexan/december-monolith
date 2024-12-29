/* eslint-disable no-inner-declarations */
import { LEDParser } from "./../../parserFunction"
import assert from "assert"

import { BinaryExpression, CallExpression, Expression, ExpressionStatement, Identifier, IfExpression, MemberExpression, Node, NumericLiteral, PrefixExpression, Statement, StringLiteral, UnitLiteral } from "../../../../tree"
import { TokenKind, getTokenKind, TokenKindName } from "../../../../token/kind"
import { ArtificialToken } from "../../../../token/core"

import type Parser from "../../.."

import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../../bindingPower"
import { EntryParser, NUDParser, SyntacticalContext, SyntaxMode } from "../../parserFunction"
import { createRegisterParserEntry } from "../../entries"
import { AnyObject, Arguments, MaybeUndefined } from "tsdef"
import { SyntacticalContextExpression } from "../../../../tree/expression/complex"

/** Parse tokens into an expression (until we reach something below the minimum binding power) */
export const parseExpression: EntryParser<Expression> = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  // 0. Here we NEVER, directly, advance the parser cursor

  let tokenKind = p.peek()
  while (p.peek() === `whitespace`) tokenKind = p.next() && p.peek() // REFACTOR: Do better

  // 1. Start of expression, there is no left context yet (so use NUD to determine left-context)
  const NUD = p.grammar.getParser(`nud`, tokenKind, p.before())
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

    const LED = p.grammar.getParser(`led`, tokenKind, p.before()) // probably advances the cursor
    assert(LED, `No LED parser for token kind "${tokenKind}"`)

    left = LED(p, left, minimumBindingPower, context)
    // TODO: Concatenate strings should ACTUALLY be a loop, eating everything until a string is reached
  }

  return left
}

export const parsePrefixExpression: NUDParser = (p: Parser, context: SyntacticalContext): Expression => {
  const operator = p.next()
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.PREFIX, context)

  return new PrefixExpression(operator, right)
}

export const parseBinaryExpression: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  const operator = p.next()
  const bindingPower = p.grammar.getBindingPower(operator.kind.name, `led`)!
  const right = p.grammar.parseExpression(p, bindingPower, context)

  return new BinaryExpression(left, operator, right)
}

export const parseConcatenatedExpression: LEDParser = (p: Parser<DefaultExpressionParserProvider>, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  if (left.type === `NumericLiteral`) return p.grammar.call(`parseImplicitMultiplication`)(p, left, minimumBindingPower, context)

  // if (left.toString() === `Feet`) debugger

  const STRING_TOKENS: TokenKindName[] = [`string`, `whitespace`]

  let stringLiteral: StringLiteral = left as StringLiteral

  let reParseStringExpression = false
  if (left.type === `Identifier`) {
    reParseStringExpression = true
    stringLiteral = new StringLiteral(...left.tokens)
  }

  assert(stringLiteral.type === `StringLiteral`, `Only string literals can have multiple tokens (found "${stringLiteral.type}")`)

  // // 2. Eat string and whitespace tokens
  while (p.hasTokens() && STRING_TOKENS.includes(p.peek())) {
    const token = p.next()
    stringLiteral.tokens.push(token)
  }

  return p.grammar.call(`parseStringExpression`)(p, stringLiteral, context)
}

export const parseImplicitMultiplication: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  const numericLiteral = left as NumericLiteral
  const operator = new ArtificialToken(getTokenKind(`asterisk`), `*`)
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, context)

  return new BinaryExpression(numericLiteral, operator, right)
}

export const parsePrimaryExpression: NUDParser = (p: Parser<DefaultExpressionParserProvider>, context: SyntacticalContext): Expression => {
  const tokenKind = p.peek()

  if (tokenKind === `number`) {
    const token = p.next()
    const number = parseFloat(token.content)
    assert(!isNaN(number), `Invalid number "${number}"`)

    return new NumericLiteral(token)
  } else if (tokenKind === `string` || tokenKind === `percentage`) {
    return p.grammar.call(`parseStringExpression`)(p, new StringLiteral(p.next()), context)
  }
  // else if (tokenKind === `identifier`) return new Identifier(p.next())

  throw new Error(`Invalid primary expression token kind "${tokenKind}"`)
}

export const parseMemberExpression: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  p.next(`double_colon`)
  const token = p.next(`string`)
  return new MemberExpression(left, token)
}

export const parseQuotedStringExpression: NUDParser = (p: Parser<DefaultExpressionParserProvider>, context: SyntacticalContext): Expression => {
  p.next(`quotes`)

  // 1. Start literal with fist token
  const stringLiteral = new StringLiteral(p.next())

  // 2. Eat string and whitespace tokens
  while (p.hasTokens() && p.peek() !== `quotes`) {
    const token = p.next()
    stringLiteral.tokens.push(token)
  }

  p.next(`quotes`)

  stringLiteral.quoted = true

  return p.grammar.call(`parseStringExpression`)(p, stringLiteral, context)
}

export const parseStringExpression = (p: Parser, stringLiteral: StringLiteral, context: SyntacticalContext): Expression => {
  // if stringLiteral is a identifier (create lookup identifier), re-create node as Identifier

  const content = stringLiteral.getContent()

  // 1. First check any re-typing rules from grammar (usually for identifiers)
  const reTypeTest = p.grammar.shouldReType(content)
  if (reTypeTest?.match?.isMatch) {
    const { type } = reTypeTest
    if (type === `Identifier`) return new Identifier(...stringLiteral.tokens)

    throw new Error(`Unimplemented re-type type "${type}"`)
  }

  // 2. Then check if it is a unit
  const unit = p.grammar.getUnit(content)
  if (unit) return new UnitLiteral(unit, ...stringLiteral.tokens)

  return stringLiteral
}

export const parseGroupingExpression: NUDParser = (p: Parser, context: SyntacticalContext): Expression => {
  // 1. What are we eating?
  const tokenKind = p.peek()
  const [opener, closer]: [TokenKindName, TokenKindName] =
    tokenKind === `open_parenthesis` ? [`open_parenthesis`, `close_parenthesis`] : tokenKind === `open_braces` ? [`open_braces`, `close_braces`] : tokenKind === `open_brackets` ? [`open_brackets`, `close_brackets`] : ([null, null] as any)

  assert(opener, `Invalid grouping expression token kind "${tokenKind}"`)

  const mode: SyntaxMode = opener === `quotes` ? `string` : context.mode

  const openerToken = p.next(opener)
  const expression = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.GROUPING, { ...context, mode })
  const closerToken = p.next(closer)

  if (context.mode === `string`) {
    assert(expression.type === `StringLiteral`, `Invalid string expression type "${expression.type}"`)
    expression.tokens.unshift(openerToken)
    expression.tokens.push(closerToken)
  }

  return expression
}

export const parseCallExpression: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  const before = p.before()

  if (before === `whitespace`) {
    left.tokens.push(p.beforeToken())
    const expression = p.grammar.parseExpression(p, minimumBindingPower, { ...context, mode: `string` })

    assert(expression.type === `StringLiteral`, `Invalid string expression type "${expression.type}"`)
    left.tokens.push(...expression.tokens)

    return p.grammar.call(`parseStringExpression`)(p, left as StringLiteral, context)
  }

  // if (left.toString() === `@itemhasmod`) debugger

  // 1. What are we eating?
  p.next(`open_parenthesis`)
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

// export const parseContextChangeExpression: NUDParser = (p: Parser, context: SyntacticalContext): Expression => {
//   const functionName = p.next(`expression_context`, `string_context`)

//   const syntaxMode: SyntaxMode = functionName.kind.name === `expression_context` ? `expression` : `string`
//   const newContext: SyntacticalContext = { ...context, mode: syntaxMode }

//   // 1. What are we eating?
//   p.next(`open_parenthesis`)
//   const args: Expression[] = []

//   // 2. Look until we eat a )
//   while (p.hasTokens() && p.peek() !== `close_parenthesis`) {
//     // 3. Parse everything above ASSIGNMENT (anything below it is a COMMA)
//     const arg = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.ASSIGNMENT, newContext)
//     args.push(arg)

//     // 4. Eat a comma (if there is one, should have unless e are at the close_paren)
//     if (p.peek() !== `close_parenthesis`) p.next(`comma`)
//   }

//   p.next(`close_parenthesis`)

//   assert(args.length === 1, `Invalid number of arguments for context change function "${functionName.content}"`)

//   return new SyntacticalContextExpression(newContext, args[0])
// }

// @if(<condition> then <consequent> else <alternative>)
export const parseIfExpression: NUDParser = (p: Parser, context: SyntacticalContext): Expression => {
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

  return new IfExpression(condition, consequent, alternative)
}

export const DEFAULT_EXPRESSION_PARSERS = {
  parseExpression,
  parsePrefixExpression,
  parseBinaryExpression,
  parseConcatenatedExpression,
  parseImplicitMultiplication,
  parsePrimaryExpression,
  parseMemberExpression,
  parseQuotedStringExpression,
  parseStringExpression,
  parseGroupingExpression,
  parseCallExpression,
  parseIfExpression,
}
export type DefaultExpressionParserProvider = typeof DEFAULT_EXPRESSION_PARSERS
