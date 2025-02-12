/** Grammar used exclusively by LEXER (lexical analysis, tokenization) */

import { isFunction, isString, orderBy, sortedIndex, sortedIndexBy } from "lodash"
import assert from "assert"

import { Match } from "@december/utils"

import { TokenKind } from "../../token/kind"
import { AnyObject, Nullable } from "tsdef"

export { DEFAULT_GRAMMAR, KEYWORD_PRIORITY } from "./default"

export interface LexicalTestOptions {
  kinds?: TokenKind[]
}

export type LexicalGrammarCustomTest = (word: string, options: LexicalTestOptions) => { isMatch: boolean }

export interface LexicalGrammarEntry<TKind extends string = TokenKind> {
  priority: number // lower is worse
  kind: TKind
  test: Match.Pattern | LexicalGrammarCustomTest
}

/** Creates a LexicalGrammarEntry */
export function createEntry<TKind extends string = TokenKind>(priority: number, kind: TKind, test: Match.Pattern | LexicalGrammarCustomTest): LexicalGrammarEntry<TKind> {
  return { priority, kind, test }
}

export interface LexicalGrammarMatch extends Omit<LexicalGrammarEntry, `test`> {
  data: AnyObject
}

export default class LexicalGrammar {
  entries: Map<string, LexicalGrammarEntry<any>>

  constructor() {
    this.entries = new Map()
  }

  /** Adds a pattern to the grammar */
  public add(...entries: LexicalGrammarEntry<any>[]) {
    for (const entry of entries) {
      assert(!this.entries.has(entry.kind), `TokenKind "${entry.kind}" already exists in LexicalGrammar`)

      this.entries.set(entry.kind, entry)
    }

    return this
  }

  /** Matches a word to N TokenKinds */
  public match(word: string, options: LexicalTestOptions): LexicalGrammarMatch[] {
    const matches: LexicalGrammarMatch[] = []

    // 1. Get relevant entries
    const allEntries = [...this.entries.values()]
    const entries = options.kinds ? allEntries.filter(entry => options.kinds!.includes(entry.kind)) : allEntries

    // 2. Test word against all entries
    for (const entry of entries) {
      const match = isFunction(entry.test) ? entry.test(word, options) : entry.test.match(word)
      if (match.isMatch)
        matches.push({
          priority: entry.priority,
          kind: entry.kind,
          data: match,
        })
    }

    // 3. sort by priority (lower is worse)
    const sorted = orderBy(matches, match => match.priority, `desc`)

    return sorted
  }
}
