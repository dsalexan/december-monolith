/* eslint-disable no-inner-declarations */
import assert from "assert"
import { AnyObject, Arguments, MaybeNull, MaybeUndefined } from "tsdef"
import { isArray, isNil, last } from "lodash"

import { BinaryExpression, CallExpression, Expression, ExpressionStatement, Identifier, IfExpression, MemberExpression, Node, NumericLiteral, PrefixExpression, Statement, StringLiteral, UnitLiteral } from "../../../../tree"
import { TokenKind, ArtificialToken } from "../../../../token"

import type Parser from "../../.."

import { LEDParser } from "./../../parserFunction"
import { DEFAULT_BINDING_POWERS } from "../bindingPowers"
import { BindingPower } from "../../bindingPower"
import { EntryParser, NUDParser, SyntacticalContext, SyntaxMode } from "../../parserFunction"
import { makeToken } from "../../../../utils/factories"
import { ExpressionList } from "../../../../tree/expression/expression"
import { Merge } from "type-fest"

/** Parse tokens into an expression (until we reach something below the minimum binding power) */
export const parseExpression: EntryParser<Expression> = (p: Parser, minimumBindingPower: BindingPower, _context: SyntacticalContext): Expression => {
  const context: SyntacticalContext = { ..._context, localAlternativeEOF: [] }
  const alternativeEOF: Merge<TokenKind, string>[] = [`end_of_file` as any, ...(_context.alternativeEOF ?? []), ...(_context.localAlternativeEOF ?? [])]

  // 0. Here we NEVER, directly, advance the parser cursor

  let tokenKind = p.peek()
  while (p.peek() === `whitespace`) tokenKind = p.next([`whitespace`], `parseExpression::skipWhitespace`) && p.peek() // REFACTOR: Do better

  // 1. Start of expression, there is no left context yet (so use NUD to determine left-context)
  const NUD = p.grammar.getParser(`nud`, tokenKind, p.before())
  assert(NUD, `No NUD parser for token kind "${tokenKind}"`)

  if (p.peek() === `comma`) debugger
  let left = NUD(p, context) // probably advances the cursor

  // 2. While current token has more binding power than treeBindingPower, keep LED parsing
  //      (i.e. only stop )
  while (p.hasTokens() && p.grammar.getBindingPower(p.peek(), `led`)! > minimumBindingPower) {
    tokenKind = p.peek()

    // SPECIAL CASE FOR PARSING: whitespace x SyntaxMode
    if (tokenKind === `whitespace`) {
      const skipWhitespace = context.mode === `expression`
      const canGlueStrings = [`StringLiteral`, `Identifier`].includes(left.type) && [`string`, `whitespace`].includes(p.peek(1))
      if (skipWhitespace && !canGlueStrings) {
        p.next([`whitespace`], `parseExpression::skipWhitespace`)
        continue
      }
    }

    if (p.peek() === `comma`) debugger
    const LED = p.grammar.getParser(`led`, tokenKind, p.before()) // probably advances the cursor
    assert(LED, `No LED parser for token kind "${tokenKind}"`)

    left = LED(p, left, minimumBindingPower, context)
    // TODO: Concatenate strings should ACTUALLY be a loop, eating everything until a string is reached
  }

  const peekTokenKind = p.peek()
  if (!alternativeEOF.includes(peekTokenKind) && !alternativeEOF.includes(`any` as any))
    assert(p.grammar.getBindingPower(peekTokenKind, `led`) !== undefined, `We are finishing the expression because token lacks a LED binding power definition`)

  return left
}

export const parseExpressionList: EntryParser<Expression> = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  const expressions: Expression[] = []

  // 1. Parse expressions, somehow breaking each expression on COMMAS
  while (p.hasTokens() && p.peek() !== `close_parenthesis`) {
    const expression = p.grammar.parseExpression(p, minimumBindingPower, { ...context, alternativeEOF: [`comma`] })
    expressions.push(expression)

    // 4. Eat a comma (if there is one, should have unless e are at the close_paren)
    if (p.peek() !== `close_parenthesis`) p.next([`comma`], `parseExpressionList`)
  }

  return new ExpressionList(...expressions)
}

export const parsePrefixExpression: NUDParser = (p: Parser, context: SyntacticalContext): Expression => {
  const operator = p.next(`any`, `parsePrefixExpression`)
  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.PREFIX, context)

  return new PrefixExpression(operator, right)
}

export const parseBinaryExpression: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  const operator = p.next(`any`, `parseBinaryExpression`)
  const bindingPower = p.grammar.getBindingPower(operator.kind, `led`)!
  const right = p.grammar.parseExpression(p, bindingPower, context)

  return new BinaryExpression(left, operator, right)
}

export const parseConcatenatedExpression: LEDParser = (p: Parser<DefaultExpressionParserProvider>, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  if (context.mode === `expression` && left.type === `NumericLiteral`) return p.grammar.call(`parseImplicitMultiplication`)(p, left, minimumBindingPower, context)

  // if (left.toString() === `Feet`) debugger

  // 1. Decide how to eat tokens
  const STRING_TOKENS: TokenKind[] = [`string`, `whitespace`]
  const eatToken = (token: TokenKind) => {
    if (context.mode === `text`) {
      const bindingPower = p.grammar.getBindingPower(token, `nud`)! ?? Infinity
      return bindingPower > minimumBindingPower
    }

    return STRING_TOKENS.includes(token)
  }

  // 2. Transform left into string literal
  let stringLiteral: StringLiteral = left as StringLiteral
  //
  if (left.type === `Identifier`) stringLiteral = new StringLiteral(...left.tokens)
  else if (left.type === `NumericLiteral`) stringLiteral = new StringLiteral(left.tokens[0])

  assert(stringLiteral.type === `StringLiteral`, `Only string literals can have multiple tokens (found "${stringLiteral.type}")`)

  // 3. Eat string and whitespace tokens
  while (p.hasTokens() && eatToken(p.peek())) {
    const token = p.next(`any`, `parseConcatenatedExpression`)
    stringLiteral.tokens.push(token)
  }

  return p.grammar.call(`parseStringExpression`)(p, stringLiteral, context)
}

export const parseImplicitMultiplication: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  assert(left.type === `NumericLiteral`, `Left must be a numeric literal expression`)
  const numericLiteral = left as NumericLiteral

  const right = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.MULTIPLICATIVE, context)

  // 1. Check if we should concatenate as a string, not a multiplication TODO:

  const operator = new ArtificialToken(`asterisk`, `*`)

  return new BinaryExpression(numericLiteral, operator, right)
}

export const parsePrimaryExpression: NUDParser = (p: Parser<DefaultExpressionParserProvider>, context: SyntacticalContext): Expression => {
  const tokenKind = p.peek()

  if (tokenKind === `number`) {
    const token = p.next(`any`, `parsePrimaryExpression::number`)
    const number = parseFloat(token.content)
    assert(!isNaN(number), `Invalid number "${number}"`)

    return new NumericLiteral(token)
  } else if (tokenKind === `string` || tokenKind === `percentage`) {
    return p.grammar.call(`parseStringExpression`)(p, new StringLiteral(p.next(`any`, `parsePrimaryExpression::string`)), context)
  }
  // else if (tokenKind === `identifier`) return new Identifier(p.next())

  throw new Error(`Invalid primary expression token kind "${tokenKind}"`)
}

export const parseMemberExpression: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  p.next([`double_colon`], `parseMemberExpression`)

  const token = p.next([`string`], `parseMemberExpression`)
  const property = p.grammar.call(`parseStringExpression`)(p, new StringLiteral(token), context)

  const memberExpression = new MemberExpression(left, property)

  let returningNode: Node = memberExpression

  // 1. First check any transforming rules from grammar (usually for identifiers)
  let i = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const transformedNode: MaybeNull<Node> = p.grammar.shouldTransformNode(returningNode)
    if (transformedNode) returningNode = transformedNode
    else break

    i++
    assert(i < 10, `Stack Overflow protection`)
  }

  return returningNode
}

export const parseQuotedStringExpression: NUDParser = (p: Parser<DefaultExpressionParserProvider>, context: SyntacticalContext): Expression => {
  p.next([`quotes`], `parseQuotedStringExpression`)

  // 1. Start literal with fist token
  const stringLiteral = new StringLiteral(p.next(`any`, `parseQuotedStringExpression::content`))

  // 2. Eat string and whitespace tokens
  while (p.hasTokens() && p.peek() !== `quotes`) {
    const token = p.next(`any`, `parseQuotedStringExpression::content`)
    stringLiteral.tokens.push(token)
  }

  p.next([`quotes`], `parseQuotedStringExpression`)

  stringLiteral.quoted = true

  const node = p.grammar.call(`parseStringExpression`)(p, stringLiteral, context)

  // TODO: Remove this from here, just applicable to GCA LOGIC
  // 3. For some fucking reason we allow member expressions inside quoted strings
  if (node.type === `StringLiteral`) {
    const content = node.getContent()
    if (content.includes(`::`)) {
      const [objectString, ...accessors] = content.split(`::`)
      assert(accessors.length === 1, `Unimplemented`)

      let buffer: MemberExpression = p.grammar.call(`parseStringExpression`)(p, new StringLiteral(makeToken(objectString)), context) as any
      for (const accessor of accessors) {
        const property = p.grammar.call(`parseStringExpression`)(p, new StringLiteral(makeToken(accessor)), context)
        buffer = new MemberExpression(buffer, property)
      }

      buffer.quoted = true
      return buffer
    }
  }

  return node
}

export const parseConcatenatedQuotedStringExpression: LEDParser = (p: Parser<DefaultExpressionParserProvider>, left: StringLiteral, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  assert(left.type === `StringLiteral`, `Left must be a string literal expression`)

  const opener = p.current()
  assert(opener.kind === `quotes`, `Invalid quoted string concatenation`)
  left.tokens.push(opener)

  const quotedLiteral: StringLiteral = p.grammar.call(`parseQuotedStringExpression`)(p, context) as StringLiteral
  assert(quotedLiteral.type === `StringLiteral`, `Invalid quoted string expression type "${quotedLiteral.type}"`)
  assert(quotedLiteral.quoted, `Invalid quoted string expression type "${quotedLiteral.type}"`)

  left.tokens.push(...quotedLiteral.tokens)

  const closer = p.current(-1)
  assert(closer.kind === `quotes`, `Invalid quoted string concatenation`)
  left.tokens.push(closer)

  return left
}

export const parseStringExpression = (p: Parser, stringLiteral: StringLiteral, context: SyntacticalContext): Expression => {
  // if stringLiteral is a identifier (create lookup identifier), re-create node as Identifier

  // 1. First check any transforming rules from grammar (usually for identifiers)
  const transformedNode = p.grammar.shouldTransformNode(stringLiteral)
  if (transformedNode) return transformedNode

  const content = stringLiteral.getContent()

  // 2. Then check if it is a unit
  const unit = p.grammar.getUnit(content)
  if (unit) return new UnitLiteral(unit, ...stringLiteral.tokens)

  // if (global.__CALL_QUEUE_CONTEXT_OBJECT.id === `12906`) debugger

  return stringLiteral
}

export const parseGroupingExpression: NUDParser = (p: Parser, context: SyntacticalContext): Expression => {
  // 1. What are we eating?
  const tokenKind = p.peek()
  const [opener, closer]: [TokenKind, TokenKind] =
    tokenKind === `open_parenthesis` ? [`open_parenthesis`, `close_parenthesis`] : tokenKind === `open_braces` ? [`open_braces`, `close_braces`] : tokenKind === `open_brackets` ? [`open_brackets`, `close_brackets`] : ([null, null] as any)

  assert(opener, `Invalid grouping expression token kind "${tokenKind}"`)

  const mode: SyntaxMode = opener === `quotes` ? `string` : context.mode

  // if (global.__CALL_QUEUE_CONTEXT_OBJECT.id === `11195`) debugger

  const openerToken = p.next([opener], `parseGroupingExpression`)

  let expression = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.GROUPING, { ...context, mode, alternativeEOF: [closer, `comma`] })
  // EXCEPTION: Grouping is grouping a list of expressions
  if (p.peek() === `comma`) {
    p.next([`comma`], `parseGroupingExpression`)
    expression = new ExpressionList(expression)

    // 2. Look until we eat a )
    while (p.hasTokens() && p.peek() !== `close_parenthesis`) {
      // 3. Parse everything above ASSIGNMENT (anything below it is a COMMA)
      const arg = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.ASSIGNMENT, { ...context, alternativeEOF: [`comma`, `close_parenthesis`] })
      expression.addChild(arg, expression.children.length, `expression${expression.children.length}`)

      // 4. Eat a comma (if there is one, should have unless e are at the close_paren)
      if (p.peek() !== `close_parenthesis`) p.next([`comma`], `parseGroupingExpression`)
    }
  }

  const closerToken = p.next([closer], `parseGroupingExpression`)

  if (context.mode === `string`) {
    assert(expression.type === `StringLiteral`, `Invalid string expression type "${expression.type}"`)
    expression.tokens.unshift(openerToken)
    expression.tokens.push(closerToken)
  }

  return expression
}

export const parseCallExpression: LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext): Expression => {
  const before = p.before()

  // A. Not a call, just a parenthesis inside a string
  if (before === `whitespace`) {
    left.tokens.push(p.beforeToken())

    // if (global.__CALL_QUEUE_CONTEXT_OBJECT.id === `12981`) debugger

    // 1. Parse expression (expecting grouping)
    // TODO: maybe refactor this mode: string thing (not really necessary)
    const expression = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.GROUPING, { ...context, mode: `string`, alternativeEOF: [`any` as any] })

    // 2. Only really get the string part
    let reverseCursor = false
    let string = left as StringLiteral
    if (expression.type === `BinaryExpression`) {
      const binaryExpression = expression as BinaryExpression
      assert(binaryExpression.left.type === `StringLiteral`, `Invalid string expression.left type "${binaryExpression.left.type}"`)

      string.tokens.push(...binaryExpression.left.tokens)
      reverseCursor = true
    } else {
      assert(expression.type === `StringLiteral`, `Invalid string expression type "${expression.type}"`)
      string.tokens.push(...expression.tokens)
    }

    // 3. Reverse cursor up until close_parenthesis
    if (reverseCursor) {
      const lastToken = last(string.tokens)!
      assert(lastToken.kind === `close_parenthesis`, `Invalid last token kind "${lastToken.kind}"`)
      assert(lastToken.type === `lexical`, `Invalid last token type "${lastToken.type}"`)
      p.moveTo(lastToken.lexeme.start + lastToken.lexeme.length)
    }

    // 4. Parse string (sometimes transforming it into a different type)
    const parsedString = p.grammar.call(`parseStringExpression`)(p, string, context)
    return parsedString
  }

  // 0. First check any recontextualization rules from grammar (usually for language-defined functions)
  const newContexts = p.grammar.shouldRecontextualize(`CallExpression`, left, context)

  // 1. What are we eating?
  p.next([`open_parenthesis`], `parseCallExpression`)
  const args: Expression[] = []

  if (isArray(newContexts)) debugger

  // 2. Look until we eat a )
  while (p.hasTokens() && p.peek() !== `close_parenthesis`) {
    if (isArray(newContexts)) assert(args.length < newContexts.length, `Invalid number of arguments for function "${left.toString()}"`)
    const localContext = isNil(newContexts) ? context : isArray(newContexts) ? newContexts[args.length] : newContexts
    assert(localContext, `Invalid local context for function "${left.toString()}"`)

    // 3. Parse everything above ASSIGNMENT (anything below it is a COMMA)
    const arg = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.ASSIGNMENT, { ...localContext, alternativeEOF: [`comma`, `close_parenthesis`] })
    args.push(arg)

    // 4. Eat a comma (if there is one, should have unless e are at the close_paren)
    if (p.peek() !== `close_parenthesis`) p.next([`comma`], `parseCallExpression`)
  }

  p.next([`close_parenthesis`], `parseCallExpression`)

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
  if (context.mode !== `if`) {
    p.next([`if`], `parseIfExpression`)
    p.next([`open_parenthesis`], `parseIfExpression`)
  }

  const condition = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.COMMA, { ...context, mode: `expression`, alternativeEOF: [`then`] })

  p.next([`then`], `parseIfExpression`)
  const consequent = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.COMMA, { ...context, mode: `expression`, alternativeEOF: [`else`, `close_parenthesis`] })

  let alternative: MaybeUndefined<Expression> = undefined
  if (p.peek() === `whitespace`) debugger // ERROR: Untested
  if (p.peek() === `else`) {
    p.next([`else`], `parseIfExpression`)
    alternative = p.grammar.parseExpression(p, DEFAULT_BINDING_POWERS.DEFAULT, { ...context, mode: `expression`, alternativeEOF: [`close_parenthesis`] })
  }

  if (p.peek() === `whitespace`) debugger // ERROR: Untested
  if (context.mode !== `if`) p.next([`close_parenthesis`], `parseIfExpression`)

  return new IfExpression(condition, consequent, alternative)
}

export const DEFAULT_EXPRESSION_PARSERS = {
  parseExpression,
  parseExpressionList,
  //
  parsePrefixExpression,
  parseBinaryExpression,
  parseConcatenatedExpression,
  parseImplicitMultiplication,
  parsePrimaryExpression,
  parseMemberExpression,
  parseQuotedStringExpression,
  parseConcatenatedQuotedStringExpression,
  parseStringExpression,
  parseGroupingExpression,
  parseCallExpression,
  parseIfExpression,
}
export type DefaultExpressionParserProvider = typeof DEFAULT_EXPRESSION_PARSERS
