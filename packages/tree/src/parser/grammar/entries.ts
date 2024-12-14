import { Match } from "@december/utils"

import { TokenKindName } from "../../token/kind"
import { NodeType } from "../../tree"
import { BindingPower } from "./bindingPower"
import { ParserFunction, ParserFunctionImplementation, ParserFunctionIndex, ParserFunctionName, SyntacticalDenotation } from "./parserFunction"
import { Entries } from "type-fest"

export interface BindingPowerEntry {
  denotation: SyntacticalDenotation
  kind: TokenKindName
  bindingPower: BindingPower
}

export interface RegisterParserEntry<TParserFunctionIndex extends ParserFunctionIndex> {
  name: ParserFunctionName<TParserFunctionIndex>
  fn: ParserFunctionImplementation<TParserFunctionIndex>
  forceRegistration?: boolean
}

export interface BindParserEntry<TParserFunctionIndex extends ParserFunctionIndex> {
  denotation: SyntacticalDenotation
  kind: TokenKindName
  parser: ParserFunctionName<TParserFunctionIndex>
  //
  bindingPower: BindingPower
}

export interface ReTyperEntry {
  key: string // just a ID key
  pattern: Match.Pattern
  type: NodeType
}

export type SyntacticalGrammarEntry<TParserFunctionIndex extends ParserFunctionIndex> = BindingPowerEntry | RegisterParserEntry<TParserFunctionIndex> | BindParserEntry<TParserFunctionIndex> | ReTyperEntry

export function isBindingPowerEntry(entry: SyntacticalGrammarEntry<any>): entry is BindingPowerEntry {
  return `bindingPower` in entry && !(`parser` in entry)
}

export function isBindParserEntry<TParserFunctionIndex extends ParserFunctionIndex>(entry: SyntacticalGrammarEntry<any>): entry is BindParserEntry<TParserFunctionIndex> {
  return `parser` in entry && `kind` in entry
}

export function isRegisterParserEntry<TParserFunctionIndex extends ParserFunctionIndex>(entry: SyntacticalGrammarEntry<any>): entry is RegisterParserEntry<TParserFunctionIndex> {
  return `fn` in entry && !(`kind` in entry)
}

export function isReTyperEntry(entry: SyntacticalGrammarEntry<any>): entry is ReTyperEntry {
  return `pattern` in entry && `type` in entry
}

export const createBindingPowerEntry = (denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower): BindingPowerEntry => ({ denotation, kind, bindingPower })
export const createReTyperEntry = (key: string, type: NodeType, pattern: Match.Pattern): ReTyperEntry => ({ key, pattern, type })
export const createRegisterParserEntry = <TParserFunctionIndex extends ParserFunctionIndex>(
  name: ParserFunctionName<TParserFunctionIndex>,
  fn: ParserFunctionImplementation<TParserFunctionIndex>,
  forceRegistration: boolean = false,
): RegisterParserEntry<TParserFunctionIndex> => ({
  name,
  fn,
  forceRegistration,
})

export function createBindParserEntry<TParserFunctionIndex extends ParserFunctionIndex>(
  denotation: `statement`,
  kind: TokenKindName,
  bindingPower: BindingPower,
  parser: ParserFunctionName<TParserFunctionIndex>,
): BindParserEntry<TParserFunctionIndex>
export function createBindParserEntry<TParserFunctionIndex extends ParserFunctionIndex>(
  denotation: `nud`,
  kind: TokenKindName,
  bindingPower: BindingPower,
  parser: ParserFunctionName<TParserFunctionIndex>,
): BindParserEntry<TParserFunctionIndex>
export function createBindParserEntry<TParserFunctionIndex extends ParserFunctionIndex>(
  denotation: `led`,
  kind: TokenKindName,
  bindingPower: BindingPower,
  parser: ParserFunctionName<TParserFunctionIndex>,
): BindParserEntry<TParserFunctionIndex>
export function createBindParserEntry<TParserFunctionIndex extends ParserFunctionIndex>(
  denotation: SyntacticalDenotation,
  kind: TokenKindName,
  bindingPower: BindingPower,
  parser: ParserFunctionName<TParserFunctionIndex>,
): BindParserEntry<TParserFunctionIndex> {
  return { denotation, kind, bindingPower, parser }
}

export function createRegisterParserEntriesFromIndex<TParserFunctionIndex extends ParserFunctionIndex>(parserFunctionIndex: TParserFunctionIndex, forceRegistration?: boolean): RegisterParserEntry<TParserFunctionIndex>[] {
  const entries: RegisterParserEntry<TParserFunctionIndex>[] = []

  const objectEntries = Object.entries(parserFunctionIndex) as Entries<TParserFunctionIndex>
  for (const [name, fn] of objectEntries) {
    entries.push(createRegisterParserEntry(name, fn as ParserFunctionImplementation<TParserFunctionIndex>, forceRegistration))
  }

  return entries
}
