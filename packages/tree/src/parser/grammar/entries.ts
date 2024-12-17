import { Match } from "@december/utils"

import { TokenKindName } from "../../token/kind"
import { NodeType } from "../../tree"
import { BindingPower } from "./bindingPower"
import { ParserFunction, SyntacticalDenotation } from "./parserFunction"
import { Entries } from "type-fest"
import { GetFunction, GetKey } from "../../utils"
import { AnyObject } from "tsdef"

export interface BindingPowerEntry {
  denotation: SyntacticalDenotation
  kind: TokenKindName
  bindingPower: BindingPower
}

export interface RegisterParserEntry<TDict> {
  name: GetKey<TDict>
  fn: GetFunction<TDict>
  override?: boolean
}

export interface BindParserEntry<TDict> {
  denotation: SyntacticalDenotation
  kind: TokenKindName
  parser: GetKey<TDict>
  //
  bindingPower: BindingPower
}

export interface ReTyperEntry {
  key: string // just a ID key
  pattern: Match.Pattern
  type: NodeType
}

export type SyntacticalGrammarEntry<TDict> = BindingPowerEntry | RegisterParserEntry<TDict> | BindParserEntry<TDict> | ReTyperEntry

export function isBindingPowerEntry(entry: SyntacticalGrammarEntry<any>): entry is BindingPowerEntry {
  return `bindingPower` in entry && !(`parser` in entry)
}

export function isBindParserEntry<TDict>(entry: SyntacticalGrammarEntry<any>): entry is BindParserEntry<TDict> {
  return `parser` in entry && `kind` in entry
}

export function isRegisterParserEntry<TDict>(entry: SyntacticalGrammarEntry<any>): entry is RegisterParserEntry<TDict> {
  return `fn` in entry && !(`kind` in entry)
}

export function isReTyperEntry(entry: SyntacticalGrammarEntry<any>): entry is ReTyperEntry {
  return `pattern` in entry && `type` in entry
}

export const createBindingPowerEntry = (denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower): BindingPowerEntry => ({ denotation, kind, bindingPower })
export const createReTyperEntry = (key: string, type: NodeType, pattern: Match.Pattern): ReTyperEntry => ({ key, pattern, type })
export const createRegisterParserEntry = <TDict>(name: GetKey<TDict>, fn: GetFunction<TDict>, override: boolean = false): RegisterParserEntry<TDict> => ({
  name,
  fn,
  override,
})

export function createBindParserEntry<TDict>(denotation: `statement`, kind: TokenKindName, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict>
export function createBindParserEntry<TDict>(denotation: `nud`, kind: TokenKindName, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict>
export function createBindParserEntry<TDict>(denotation: `led`, kind: TokenKindName, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict>
export function createBindParserEntry<TDict>(denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict> {
  return { denotation, kind, bindingPower, parser }
}

export function createRegisterParserEntriesFromIndex<TDict extends AnyObject>(fnDictionary: TDict, override?: boolean): RegisterParserEntry<TDict>[] {
  const entries: RegisterParserEntry<TDict>[] = []

  const objectEntries = Object.entries(fnDictionary) as [GetKey<TDict>, GetFunction<TDict>][]
  for (const [name, fn] of objectEntries) {
    entries.push(createRegisterParserEntry(name, fn, override))
  }

  return entries
}
