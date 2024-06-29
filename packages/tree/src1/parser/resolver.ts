import { identity, isEqual, isString, last, sortBy, uniq } from "lodash"
import type TreeParser from "."

import { SyntaxNode } from "../node"
import { EnclosureSyntax } from "../syntax/enclosure"
import { SyntaxMatch, SyntaxName, SyntaxWithSymbol } from "../syntax/manager"
import { Syntax, SyntaxSymbol } from "../syntax/syntax"
import { isDebuggerStatement } from "typescript"
import { SeparatorSyntax } from "../syntax/separator"
import { PatternSyntax } from "../syntax/pattern"

type PackagedDecision = ResolveDirective | { directive: ResolveDirective; symbol?: string }

export default class Resolver {
  parser: TreeParser

  get syntaxManager() {
    return this.parser.syntaxManager
  }

  constructor(parser: TreeParser) {
    this.parser = parser
  }

  canResolve(node: SyntaxNode) {
    // if (!node.isValid) throw new Error(`Invalid node: ${node.value} (${node.context})`)

    return true
  }

  _nextTokenOld(start: number, text: string) {
    // a token should be a word, i.e. [0-9A-Za-z_$]
    const wordPattern = /[0-9A-Za-z_$@:]/
    const numericPattern = /[0-9]/

    let i = start

    // consume characters until a token is formed
    let token = text[i]
    if (token.match(wordPattern))
      do {
        if (i + 1 >= text.length) continue
        const nextCharacter = text[i + 1]

        if (!nextCharacter) debugger
        // if character does not form a word, break loop
        if (!nextCharacter.match(wordPattern)) break

        // if it forms, add to token and keep consuming
        token += nextCharacter
        i++
      } while (i + 1 < text.length)
    // else i += token.length

    return { token, offset: i - start }
  }

  __matchToken(token: string) {
    const wordPattern = /^[0-9A-Za-z_$@:\>\<\=]+$/
    const numericPattern = /^-?([0-9][0-9,\.]*|\.[0-9][0-9,\.]*)$/

    // is number if entire token is numeric shit only
    if (token.match(numericPattern)) return `number`

    // is string only if entire token is letters, numbers and some allowed characters
    if (token.match(wordPattern)) return `string`

    if (token.match(/^ +$/)) return `whitespace`

    return `unknown`
  }

  _matchToken(token: string, currentType: `string` | `number` | `whitespace` | `unknown` | undefined) {
    const newType = this.__matchToken(token)

    // if there is not a "current type", just return
    if (currentType === undefined) return newType

    // if current type is string and new type is number, consider it a string still
    if (currentType === `string` && newType === `number`) return `string`

    return newType
  }

  /** Fetches the next token in text, starting at start */
  _nextToken(start: number, text: string): { token: string; type: `string` | `number` | `whitespace` | `unknown`; offset: number } {
    let i = start

    // ERROR: Emptu string
    if (text.length === 0) debugger

    let token: string = ``
    let type: ReturnType<typeof this._matchToken> | undefined = undefined
    // consume characters until a token is formed
    do {
      const futureToken = token + text[i++] // consume character at i
      const futureType = this._matchToken(futureToken, type) // match to type

      // if token type would change, dont consume character and bail out
      if (futureType !== type && type !== undefined) break

      // consume character
      token = futureToken
      type = futureType

      // if type is weird, bail out
      // if we are at the last token, bail out
    } while (i + 1 < text.length && type !== `unknown`)

    return { token, type: type ?? `unknown`, offset: token.length - 1 }
  }

  resolve(node: SyntaxNode, text: string): number {
    let carryStringNode = null as SyntaxNode | null // carry string node found

    let i = 0
    while (i < text.length) {
      // consume characters until a token is formed
      const { token, type, offset } = this._nextToken(i, text)
      i += offset

      // check if token matches the expected patterns to a symbol of any syntax
      const syntaxMatches = this.syntaxManager.match(token, `resolve`)

      // decide HOW to parse token
      let { directive, syntaxWithSymbol, match } = this._decide(node, token, type, syntaxMatches)

      // change tree structure based on directive
      //    1. try to create new nodes
      if (directive === `open_new`) {
        const child = node.child().setSyntax(syntaxWithSymbol)

        const offsetCursor = this.resolve(child, text.slice(i + 1)) + 1

        // if node IS balanced
        if (child.hasValue) i += offsetCursor
        else {
          // remove node from children
          node.removeChild(child)

          // inform character at index is unbalanced
          directive = `unbalanced`
        }
      } else if (directive === `open_and_close_at_token`) {
        // consider current token as a separate node on its on (child to current node)
        const child = node.child().setSyntax(syntaxWithSymbol)
        child.close(token)
      } else if (directive === `break_token_in_matches`) {
        // NODE: double-checking if my regex grouping is correct
        const _test = match.map(({ value }) => value).join(``)
        if (_test !== token) debugger

        // break token in parts (indicated inside match)
        for (const { value, group, index } of match) {
          // make new node for each part (or match)
          const child = node.child()

          if (group === -1) {
            // not part of the syntax
            this.resolve(child, value)

            if (child.__syntax !== `unknown`) debugger

            node.removeChild(child)
            node.addChild(...child.children)

            // NOTE: How should I parse this?
          } else {
            // part of the syntax
            child.setSyntax(syntaxWithSymbol)
            child.close(value)
          }
        }

        // lock carry
        carryStringNode = null
      }

      //    2. trying to close nodes (current one or discarding unbalanced)
      if (directive === `close_current`) {
        if (syntaxWithSymbol.syntax.type !== `enclosure`) debugger

        const enclosureSyntax = syntaxWithSymbol.syntax as EnclosureSyntax

        // close node and bail loop, no need to check further characters for this node specifically
        node.close(`${enclosureSyntax.opener}${text.slice(0, i)}${enclosureSyntax.closer}`)
        if (syntaxWithSymbol.symbol !== undefined) node.__syntaxSymbolKey = syntaxWithSymbol.symbol

        break
      } else if (directive === `unbalanced`) {
        // register unbalanced character inside node (and which syntax it was supposed to be)
        node.unbalanced.push({ index: i, syntax: syntaxWithSymbol.syntax.name })

        // since it is not truly a relevant character, consider it a string
        directive = `string`
      }

      //    3. parse as a string if necessary
      if (directive === `string`) {
        // recover carry (create one if necessary)
        carryStringNode = this._carry(node, syntaxWithSymbol)

        // advance carry one character
        carryStringNode.value += token
      } else if (directive === `unknown`) {
        // ERROR: Can NEVER parse as unknown
        debugger
      }

      i++
    }

    // TODO: validation, tree must remain, well, valid
    // const validation = this.node.validate()
    // if (!validation.success && this.node.validator.tree()) debugger

    node.state = `resolved`

    // For a resolved node, it is expected to have a value (when balanced, of course, since unbalanced nodes are eventually discarded)
    // IF NODE HAS NO VALUE IT IS UNBALANCED
    // if (!node.hasValue) debugger

    if (node.hasValue) {
      // after resolving each character in substring, reorganize
      this.parser.reorganizer.reorganize(node)
    }

    return i // return cursor position to resume resolving in nested calls
  }

  // #region Syntatic Decision Tree

  _decide(node: SyntaxNode, token: string, tokenType: `string` | `number` | `whitespace` | `unknown`, _matches: SyntaxMatch[]): { directive: ResolveDirective; syntaxWithSymbol: SyntaxWithSymbol; match: SyntaxMatch[`match`] } {
    // if token is no symbol, it is a primitive
    if (_matches.length === 0) {
      const syntax = tokenType === `number` ? `number` : tokenType === `whitespace` ? `whitespace` : `string`

      return { directive: `string`, syntaxWithSymbol: { syntax: this.syntaxManager.get(syntax), symbol: undefined }, match: [] }
    }

    // if (_matches.length > 1) debugger

    // 0. create stub node (simulating the node that would be created if a match was chosen)
    const stubNode = node.child()

    // filter only valid matches
    const validMatches: SyntaxMatch[] = []
    for (const match of _matches) {
      const syntax = this.syntaxManager.get(match.syntax as SyntaxName)
      const symbol = syntax.getSymbol(match.symbol!)

      stubNode.setSyntax(match.syntax, match.symbol)

      let isValid = true

      // 1. validade syntax restrictions (if any)
      if (syntax.restrictions.shouldValidate(`resolve`)) {
        debugger
        const { valid, invalidRestrictions } = syntax.restrictions.validate(stubNode, `resolve`)

        if (!valid) isValid = false
      }

      // 2. symbol restrictions must be obeyed (if any)
      if (symbol) {
        if (symbol.restrictions.shouldValidate(`resolve`)) {
          const { valid, invalidRestrictions } = symbol.restrictions.validate(stubNode, `resolve`)

          if (!valid) isValid = false
        }
      }

      if (isValid) validMatches.push(match)
    }

    // destroy stub node
    node.__children.pop()

    // choose most prioritest (lowest prio) match
    const priorities = validMatches.map((match: any) => match.priority ?? Infinity)
    const priority = Math.min(...priorities)
    const matches = validMatches.filter((match: any) => (match.priority ?? Infinity) === priority)

    const _symbols = matches.map(({ symbol }) => symbol)
    const areMatchesTheSameSyntax = matches.every(({ syntax }) => syntax === matches[0].syntax)
    const areDoubleMatchesDueToEqualOpenerAndCloser = areMatchesTheSameSyntax && matches.length === 2 && isEqual(sortBy(_symbols, identity), [`closer`, `opener`])

    if (areDoubleMatchesDueToEqualOpenerAndCloser) {
      // do nothing
    }
    // ERROR: Unimplemented
    else if (matches.length > 1) debugger

    let { syntax: syntaxName, symbol, match } = matches[0]
    const syntax = this.syntaxManager.get(syntaxName as SyntaxName)
    const syntaxWithSymbol = { syntax, symbol } as SyntaxWithSymbol

    // decide directive based on syntax
    let decision = `unknown` as ResolveDirective | { directive: ResolveDirective; symbol?: string }
    if (syntaxWithSymbol.syntax.type === `enclosure`) decision = this._enclosure(node, token, match, syntaxWithSymbol as SyntaxWithSymbol<EnclosureSyntax>)
    else if (syntaxWithSymbol.syntax.type === `separator`) decision = this._separator(node, token, match, syntaxWithSymbol as SyntaxWithSymbol<SeparatorSyntax>)
    // this is not the full pattern node (which is always a "master"), but one of its symbols
    else if (syntaxWithSymbol.syntax.type === `pattern`) decision = this._pattern(node, token, match, syntaxWithSymbol as SyntaxWithSymbol<PatternSyntax>)
    else {
      debugger
    }

    // unpack symbol from decision
    let directive: ResolveDirective = `unknown`
    let postDecisionSymbolKey = symbol
    if (isString(decision)) directive = decision
    else {
      directive = decision.directive
      postDecisionSymbolKey = decision.symbol ?? postDecisionSymbolKey
    }

    return { directive, syntaxWithSymbol: { syntax, symbol: postDecisionSymbolKey }, match }
  }

  _enclosure(node: SyntaxNode, token: string, match: SyntaxMatch[`match`], enclosureSyntax: SyntaxWithSymbol<EnclosureSyntax>): PackagedDecision {
    // ERROR: Partial match unimplemented
    if (match.length > 1) debugger

    const itClosesThisNode = token === (node.syntax as EnclosureSyntax).closer
    const isOpener = token === enclosureSyntax.syntax.opener
    const isCloser = token === enclosureSyntax.syntax.closer

    // NOTE: checking just to be sure
    if (isOpener && enclosureSyntax.symbol !== `opener` && !enclosureSyntax.syntax.sameSymbolForOpenerAndCloser()) debugger
    if (isCloser && enclosureSyntax.symbol !== `closer` && !enclosureSyntax.syntax.sameSymbolForOpenerAndCloser()) debugger

    // check if it is the closer expected for this node
    //    if it is, then end of node found, break from loop
    //    (and set node's syntatic symbol as "master" — replacing opener)
    if (itClosesThisNode) return { directive: `close_current`, symbol: `master` }

    // character is an opener for an enclosure
    //    so create a new node for the enclosure
    if (isOpener) return `open_new`

    // found an closer character in the wild
    //    since it is not a closer for this node, it is UNBALANCED
    if (isCloser) return `unbalanced`

    // ERROR: Enclosure behaviour not implemented
    debugger

    return `unknown`
  }

  _separator(node: SyntaxNode, token: string, match: SyntaxMatch[`match`], syntax: SyntaxWithSymbol<SeparatorSyntax>): PackagedDecision {
    const separatorSyntax = syntax as SyntaxWithSymbol<SeparatorSyntax>

    if (match.length > 1) return `break_token_in_matches`

    // currently there is nothing to check against here
    // any relevant decision about a Xator syntax is mostly parent/grandparent stuff, and this is automatic inside the recipe list decision for every character
    //     (that when a syntax ACTUALLY has parentage restrictions)
    return `open_and_close_at_token`
  }

  _pattern(node: SyntaxNode, token: string, match: SyntaxMatch[`match`], syntax: SyntaxWithSymbol<PatternSyntax>): PackagedDecision {
    const patternSyntax = syntax as SyntaxWithSymbol<PatternSyntax>

    return `break_token_in_matches`
  }

  // #endregion

  _carry(node: SyntaxNode, _syntaxWithSymbol: SyntaxWithSymbol<Syntax>) {
    const children = node.children

    // original syntax for token can be anything (like a rejected enclosure), so we parse unwanted syntaxes to string
    const syntaxWithSymbol: SyntaxWithSymbol<Syntax> = _syntaxWithSymbol.syntax.type === `primitive` ? _syntaxWithSymbol : { syntax: this.syntaxManager.get(`string`), symbol: undefined }

    // first check if last child could be a matching carry primitive node
    const lastChild = last(children) as SyntaxNode

    const isMatchingPrimitive = lastChild?.syntax?.name === syntaxWithSymbol.syntax.name
    // TODO: Should we check symbol?
    if (syntaxWithSymbol.symbol) debugger

    let carry: SyntaxNode
    if (isMatchingPrimitive) {
      //    if last child is a string
      return lastChild
    } else {
      // if not, create a new carry string node
      carry = node.child().setSyntax(syntaxWithSymbol.syntax.name, syntaxWithSymbol.symbol)
      carry.value = ``
    }

    return carry
  }
}

const STRING_RESOLVE_DIRECTIVES = [`string`] as const
const SYNTAX_RESOLVE_DIRECTIVES = [
  `unbalanced`, // closer character in the wild, mark as unbalanced but consider it string
  `open_new`, // create a new node for the syntax
  `close_current`, // close current node
  `open_and_close_at_token`, // create a new node only for the character (close it immediately),
  `break_token_in_matches`, // break token in indexes indicated in syntaxMatch, creating new nodes for each part
] as const
const RESOLVE_DIRECTIVES = [`unknown`, ...SYNTAX_RESOLVE_DIRECTIVES, ...STRING_RESOLVE_DIRECTIVES] as const

type StringResolveDirective = (typeof STRING_RESOLVE_DIRECTIVES)[number]
type SyntaxResolveDirective = (typeof SYNTAX_RESOLVE_DIRECTIVES)[number]
type ResolveDirective = (typeof RESOLVE_DIRECTIVES)[number]
