import crypto from "crypto"
import { findLastIndex, includes, isNil, isString, lastIndexOf, uniq, has, uniqBy, cloneDeep, orderBy } from "lodash"

import { Syntax, SyntaxReference, SyntaxSymbol, SyntaxSymbolPattern, SyntaxTypeSet, Type } from "./syntax"

import * as Primitive from "./primitive"
import * as Enclosure from "./enclosure"
import * as Separator from "./separator"
import * as Pattern from "./pattern"
import { getRestrictionReason } from "./restriction"
import type { TreeParsingStage } from "../parser"

export type SyntaxName = Primitive.PrimitiveSyntaxName | Enclosure.EnclosureSyntaxName | Separator.SeparatorSyntaxName | Pattern.PatternSyntaxName

export const DEFAULT_SYNTAXES = [...Primitive.SYNTAX_NAMES, ...Enclosure.SYNTAX_NAMES, ...Separator.DEFAULT_SYNTAX_NAMES]
export const MATH_SYNTAXES = [...Separator.SEPARATOR_MATH_AND_LOGICAL_SYNTAX_NAMES, ...Pattern.PATTERN_MATH_SYNTAX_NAMES]

export * as Pattern from "./pattern"
export * as Separator from "./separator"

export function getSyntaxByName(syntaxName: SyntaxName) {
  return Primitive.SYNTAXES_BY_NAME[syntaxName] || Enclosure.SYNTAXES_BY_NAME[syntaxName] || Separator.SYNTAXES_BY_NAME[syntaxName] || Pattern.SYNTAXES_BY_NAME[syntaxName] // || Aggregator.SYNTAXES_BY_NAME[syntaxName]
}

export default class SyntaxManager {
  readonly id: string = crypto.randomBytes(16).toString(`hex`) // uniq random readonly

  syntaxes: Record<string, Syntax>

  // __stringSymbols: Record<string, SyntaxSymbolIndex[]> // symbol -> syntax name
  // __regexSymbols: [RegExp, SyntaxSymbolIndex][]
  _: {
    syntaxes: {
      byStringPattern: Record<string, SyntaxReference[]> & { __includes: (pattern: string, reference: SyntaxReference) => boolean } // string pattern -> syntax/symbol[]
      byRegexPattern: [RegExp, SyntaxReference & { priority: number }][] & { __includes: (pattern: RegExp, reference: SyntaxReference) => boolean } // regex pattern -> syntax/symbol
      bySyntaxPattern: Record<string, SyntaxReference[]> & { __includes: (pattern: SyntaxReference, reference: SyntaxReference) => boolean } // expected syntax name + symbol key -> syntax/symbol[]
      bySyntaxTypeSet: Record<Type, { rule: SyntaxTypeSet[`rule`]; syntaxes: SyntaxReference[]; reference: SyntaxReference }[]> & { __includes: (type: Type, reference: SyntaxReference) => boolean } // type -> (rule, syntax reference[])[]
      byTag: Record<string, SyntaxReference[]> & { __includes: (tag: string, reference: SyntaxReference) => boolean } // tag -> syntax/symbol[]
    }
  }

  // secondary child managers
  __managers: Record<SyntaxManager[`id`], SyntaxManager> = {}

  constructor(syntaxes: (Syntax | SyntaxName)[]) {
    this.syntaxes = {}

    this._ = {
      syntaxes: {
        byStringPattern: {} as Record<string, SyntaxReference[]> & { __includes: (pattern: string, reference: SyntaxReference) => boolean },
        byRegexPattern: [] as any as [RegExp, SyntaxReference & { priority: number }][] & { __includes: (pattern: RegExp, reference: SyntaxReference) => boolean },
        bySyntaxPattern: {} as Record<string, SyntaxReference[]> & { __includes: (pattern: SyntaxReference, reference: SyntaxReference) => boolean },
        bySyntaxTypeSet: {} as Record<Type, { rule: SyntaxTypeSet[`rule`]; syntaxes: SyntaxReference[]; reference: SyntaxReference }[]> & { __includes: (type: Type, reference: SyntaxReference) => boolean },
        byTag: {} as Record<string, SyntaxReference[]> & { __includes: (tag: string, reference: SyntaxReference) => boolean },
      },
    }

    // inject contains utility functions
    this._.syntaxes.byStringPattern.__includes = (pattern: string, reference: SyntaxReference) => this._.syntaxes.byStringPattern[pattern]?.some(s => s.syntax === reference.syntax && s.symbol === reference.symbol)
    this._.syntaxes.byRegexPattern.__includes = (pattern: RegExp, reference: SyntaxReference) => {
      for (const [regex, ref] of this._.syntaxes.byRegexPattern) {
        if (regex.source !== pattern.source) continue
        if (ref.syntax === reference.syntax && ref.symbol === reference.symbol) return true
      }

      return false
    }
    this._.syntaxes.bySyntaxPattern.__includes = (pattern: SyntaxReference, reference: SyntaxReference) => this._.syntaxes.bySyntaxPattern[Syntax.flatten(pattern)]?.some(s => s.syntax === reference.syntax && s.symbol === reference.symbol)
    // a type set can repeat, i say for no reason
    this._.syntaxes.bySyntaxTypeSet.__includes = (type: Type, reference: SyntaxReference) => this._.syntaxes.bySyntaxTypeSet[type]?.some(s => s.reference.syntax === reference.syntax && s.reference.symbol === reference.symbol)
    this._.syntaxes.byTag.__includes = (tag: string, reference: SyntaxReference) => this._.syntaxes.byTag[tag]?.some(s => s.syntax === reference.syntax && s.symbol === reference.symbol)

    // TODO: Prioritize object syntaxes to strings
    const uniqSyntaxes: (Syntax<SyntaxSymbolPattern> | SyntaxName)[] = uniqBy(syntaxes, syntax => (typeof syntax === `string` ? syntax : syntax.name))

    this.add(...uniqSyntaxes)
  }

  // #region UTILS

  syntaxNames() {
    return Object.keys(this.syntaxes)
  }

  has(name: SyntaxName) {
    return this.syntaxes[name] !== undefined
  }

  get(name: SyntaxName) {
    const main = this.syntaxes[name] ?? null

    if (!main) {
      // search in some of the child managers
      const fromChildren = Object.values(this.__managers)
        .map(manager => manager.get(name))
        .filter(Boolean) as Syntax[]

      // ERROR: How to decide? Maybe a node should be attached to a manager in some way???
      if (fromChildren.length > 1) debugger

      if (fromChildren.length === 1) return fromChildren[0]
    }

    return main
  }

  // #endregion

  clone(syntaxes: (Syntax | SyntaxName)[], reset = false) {
    const oldSyntaxes = reset ? [] : this.syntaxNames()

    // TODO: Allow clonning of syntaxes of the name "base" syntax

    const _syntaxes = uniq([...oldSyntaxes, ...syntaxes.map(syntax => (typeof syntax === `string` ? syntax : syntax.name))])
    const manager = new SyntaxManager(_syntaxes as SyntaxName[])

    return manager
  }

  addChild(manager: SyntaxManager) {
    // ERROR: Secondary manager already exists
    if (this.__managers[manager.id]) debugger

    this.__managers[manager.id] = manager
  }

  _add(syntaxOrSyntaxName: Syntax | SyntaxName) {
    // parse args
    let syntax: Syntax = syntaxOrSyntaxName as Syntax
    if (isString(syntaxOrSyntaxName)) syntax = getSyntaxByName(syntaxOrSyntaxName)

    // ERROR: Syntax name is not indexed (probably was not added in <Specialization.RECIPE_NAMES) OR a custom recipe was added by name
    if (!syntax) debugger

    // ERROR: Syntax already exists
    if (this.syntaxes[syntax.name]) debugger
    this.syntaxes[syntax.name] = syntax

    // if (syntax.name === `implicit_multiplication`) debugger

    // index symbol patterns
    for (const symbol of syntax.symbols) {
      const reference: SyntaxReference = { syntax: syntax.name, symbol: symbol.key }
      const priority = isNil(syntax.priority) ? Infinity : syntax.priority + (symbol.priority ?? 0)

      for (const pattern of symbol.patterns) {
        if (typeof pattern === `string`) {
          if (!this._.syntaxes.byStringPattern.__includes(pattern, reference)) {
            this._.syntaxes.byStringPattern[pattern] ??= []
            this._.syntaxes.byStringPattern[pattern].push(reference)
          }
        } else if (pattern instanceof RegExp) {
          if (!this._.syntaxes.byRegexPattern.__includes(pattern, reference)) {
            this._.syntaxes.byRegexPattern.push([pattern, { ...reference, priority }])
          }
        } else if (has(pattern, `syntax`)) {
          const syntaxPattern = pattern as SyntaxReference<SyntaxName>
          if (!this._.syntaxes.bySyntaxPattern.__includes(syntaxPattern, reference)) {
            const _pattern = Syntax.flatten(syntaxPattern)
            this._.syntaxes.bySyntaxPattern[_pattern] ??= []
            this._.syntaxes.bySyntaxPattern[_pattern].push(reference)
          }
        } else if (has(pattern, `type`)) {
          const typeSetPattern = pattern as SyntaxTypeSet<SyntaxName>
          if (!this._.syntaxes.bySyntaxTypeSet.__includes(typeSetPattern.type, reference)) {
            this._.syntaxes.bySyntaxTypeSet[typeSetPattern.type] ??= []
            this._.syntaxes.bySyntaxTypeSet[typeSetPattern.type].push({ rule: typeSetPattern.rule, syntaxes: cloneDeep(typeSetPattern.syntaxes), reference })
          }
        } else if (has(pattern, `tags`)) {
          for (const tag of (pattern as { tags: string[] }).tags) {
            if (!this._.syntaxes.byTag.__includes(tag, reference)) {
              this._.syntaxes.byTag[tag] ??= []
              this._.syntaxes.byTag[tag].push(reference)
            }
          }
        } else {
          // ERROR: Unimplemented Syntax Symbol Pattern
          debugger
        }
      }
    }

    return true
  }

  add(...syntaxes: (Syntax | SyntaxName)[]): void {
    for (const syntax of syntaxes) {
      this._add(syntax)
    }
  }

  _match_string(text: string): SyntaxMatch[] {
    const syntaxes = this._.syntaxes.byStringPattern[text] ?? []

    // inject match shit
    return syntaxes.map(syntax => {
      return {
        ...syntax,
        match: [{ value: text, index: 0, group: 0 }],
      }
    })
  }

  _match_regex(text: string): SyntaxMatch[] {
    let matches = [] as (SyntaxMatch & { priority: number })[]

    // for each regex pattern indexed
    for (const [pattern, syntax] of this._.syntaxes.byRegexPattern) {
      const match: SyntaxMatch & { priority: number } = { ...syntax, match: [] }

      const input = text
      const regexes = pattern.global ? [...input.matchAll(pattern)] : ([input.match(pattern)].filter(Boolean) as RegExpMatchArray[])

      // if there is no match, bail out
      if (regexes.length === 0) continue

      // TODO: Order regexes in byRegexPattern by priority (so we dont need to order by below)
      for (let i = 0; i < regexes.length; i++) {
        // get partial regex
        const partial = regexes[i]
        const previousPartial = regexes[i - 1]

        const index = partial.index!

        // if there is a previous partial, find out where it ends
        let previousEndIndex = 0
        if (previousPartial) previousEndIndex = previousPartial.index! + previousPartial[0].length // first index NOT PART OF previous partial

        // if partial itself DOES NOT start at 0, add a non-matching token to list
        if (index > 0) {
          const previousNonMatchingToken = input.slice(previousEndIndex, index)
          match.match.push({ value: previousNonMatchingToken, group: -1, index: previousEndIndex })
        }

        // add partial to list
        match.match.push({ value: partial[0], group: i, index })
      }

      // add last non-matching token, if any
      const lastRegex = regexes[regexes.length - 1]
      const lastEndIndex = lastRegex.index! + lastRegex[0].length
      if (lastEndIndex < input.length) match.match.push({ value: input.slice(lastEndIndex), group: -1, index: lastEndIndex })

      // check if my regex grouping is correct
      const _test = match.match.map(({ value }) => value).join(``)
      if (_test !== text) debugger

      matches.push(match)

      // So... We are only returning the first regex pattern that matches the text. Is this correct? No
    }

    const sortedMatches = orderBy(matches, [`priority`], [`asc`])

    return sortedMatches
  }

  _match_syntax(nodeSyntax: SyntaxReference & { type: Type }): SyntaxMatch[] {
    const reference = Syntax.flatten(nodeSyntax)

    const byTypeSet =
      this._.syntaxes.bySyntaxTypeSet[nodeSyntax.type]?.filter(({ rule, syntaxes, reference }) => {
        if (rule === `any`) return true
        else if (rule === `at_least_one`) return syntaxes.some(syntax => syntax.syntax === nodeSyntax.syntax && syntax.symbol === nodeSyntax.symbol)
        else if (rule === `none`) return !syntaxes.some(syntax => syntax.syntax === nodeSyntax.syntax && syntax.symbol === nodeSyntax.symbol)
        else {
          // ERROR: Unimplemented Syntax Type Set Rule
          debugger
        }

        return false
      }) ?? []

    const byPattern = this._.syntaxes.bySyntaxPattern[reference] ?? []

    const syntaxes = [
      ...uniqBy(
        byTypeSet.map(({ reference }) => reference),
        reference => `${reference.syntax}::${reference.symbol}`,
      ),
      ...byPattern,
    ]

    // inject match shit
    return syntaxes.map(syntax => {
      return {
        ...syntax,
        match: [],
      }
    })
  }

  _match_tags(reference: SyntaxReference): SyntaxMatch[] {
    const syntax = this.syntaxes[reference.syntax]
    const symbol = syntax.getSymbol(reference.symbol!) ?? { tags: [] }

    const tags = uniq([...syntax.tags, ...symbol.tags])

    const syntaxes: SyntaxReference[] = []
    for (const tag of tags) {
      syntaxes.push(...(this._.syntaxes.byTag[tag] ?? []))
    }

    // inject match shit
    return syntaxes.map(syntax => {
      return {
        ...syntax,
        match: [],
      }
    })
  }

  _allow_matches(matches: SyntaxMatch[], stage: TreeParsingStage) {
    // remove those not allowed
    const allowedSyntaxes = [] as SyntaxMatch[]
    const refusedSyntaxes = {} as Record<string, SyntaxMatch[]> // reason why invalid -> syntaxes
    for (const syntaxMatch of matches) {
      const { syntax: name, symbol, match } = syntaxMatch

      const syntax = this.syntaxes[name]
      const syntaxWithSymbol = { syntax, symbol }

      if (!syntax.restrictions.shouldValidate(stage)) {
        allowedSyntaxes.push(syntaxMatch)
      } else {
        // TODO: In this case, we dont have any offset >= 0 (or the node itself, for that matter). How to validate?
        debugger
        const { valid, invalidRestrictions } = syntax.restrictions.validate(syntaxWithSymbol as any, stage, { full: true })
        // if (!syntax.validateRestriction(`parents`, [syntax])) invalidRestrictions.push(`parents`)
        // if (!syntax.validateRestriction(`grandparents`, [syntax])) invalidRestrictions.push(`grandparents`)

        if (invalidRestrictions.length === 0) allowedSyntaxes.push(syntaxMatch)
        else {
          for (const { restriction } of invalidRestrictions) {
            const reason = getRestrictionReason(restriction)
            if (!refusedSyntaxes[reason]) refusedSyntaxes[reason] = []
            refusedSyntaxes[reason].push(syntaxMatch)
          }
        }
      }
    }

    // WARN: Untested when some recipe is refused
    if (Object.keys(refusedSyntaxes).length > 0) debugger

    return allowedSyntaxes
  }

  match(text: string, stage: TreeParsingStage): SyntaxMatch[]
  match(syntax: SyntaxReference & { type: Type }, stage: TreeParsingStage): SyntaxMatch[]
  match(textOrSyntax: string | (SyntaxReference & { type: Type }), stage: TreeParsingStage): SyntaxMatch[] {
    if (stage !== `resolve` && stage !== `reorganize`) debugger

    let syntaxMatches: SyntaxMatch[] = []

    if (typeof textOrSyntax === `string`) {
      syntaxMatches = this._match_string(textOrSyntax)

      // WARN: For performance reasons we only search by REGEX if no string match was found
      if (syntaxMatches.length === 0) syntaxMatches = this._match_regex(textOrSyntax)
    } else {
      const reference = textOrSyntax

      syntaxMatches = this._match_syntax(reference)

      syntaxMatches.push(...this._match_tags(reference))
    }

    // remove those not allowed
    return this._allow_matches(syntaxMatches, stage)
  }
}

export interface SyntaxWithSymbol<TSyntax extends Syntax = Syntax> {
  syntax: TSyntax
  symbol?: SyntaxSymbol<SyntaxSymbolPattern>[`key`]
}

export interface SyntaxMatch extends SyntaxReference {
  match: { index: number; value: string; group: number }[]
  // group === -1 means the value is not part of the match, i.e. not inside of a capturing group of the regex pattern
  // an empty match means there was no textual matching (like when just the node's syntax is compared)
}
