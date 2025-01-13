import { Match } from "@december/utils"

import { TokenKindName } from "../../token/kind"
import { Node, NodeType } from "../../tree"
import { BindingPower } from "./bindingPower"
import { ParserFunction, SyntacticalContext, SyntacticalDenotation } from "./parserFunction"
import { Entries } from "type-fest"
import { GetFunction, GetKey } from "../../utils"
import { AnyObject, MaybeArray, Nullable } from "tsdef"

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

export interface TransformNodeEntry {
  key: string // just an ID key
  from: NodeType // the type to transform from (mostly for faster indexing)
  pattern: Match.Pattern // pattern to match NODE
  to: NodeType | Node | ((originalNode: Node) => Node) // type to transform to OR Node to transform to OR function-returning Node
}

export interface RecontextualizationEntry {
  key: string // just an ID key
  from: NodeType // the type to transform from (mostly for faster indexing)
  pattern: Match.Pattern // pattern to match NODE
  reContextualization: (originalNode: Node, context: SyntacticalContext) => Nullable<MaybeArray<SyntacticalContext>>
}

export type SyntacticalGrammarEntry<TDict> = BindingPowerEntry | RegisterParserEntry<TDict> | BindParserEntry<TDict> | TransformNodeEntry | RecontextualizationEntry

export function isBindingPowerEntry(entry: SyntacticalGrammarEntry<any>): entry is BindingPowerEntry {
  return `bindingPower` in entry && !(`parser` in entry)
}

export function isBindParserEntry<TDict>(entry: SyntacticalGrammarEntry<any>): entry is BindParserEntry<TDict> {
  return `parser` in entry && `kind` in entry
}

export function isRegisterParserEntry<TDict>(entry: SyntacticalGrammarEntry<any>): entry is RegisterParserEntry<TDict> {
  return `fn` in entry && !(`kind` in entry)
}

export function isTransformNodeEntry(entry: SyntacticalGrammarEntry<any>): entry is TransformNodeEntry {
  return `pattern` in entry && `from` in entry && `to` in entry
}

export function isReContextualizationEntry(entry: SyntacticalGrammarEntry<any>): entry is RecontextualizationEntry {
  return `reContextualization` in entry
}

export const createBindingPowerEntry = (denotation: SyntacticalDenotation, kind: TokenKindName, bindingPower: BindingPower): BindingPowerEntry => ({ denotation, kind, bindingPower })
export const createRegisterParserEntry = <TDict>(name: GetKey<TDict>, fn: GetFunction<TDict>, override: boolean = false): RegisterParserEntry<TDict> => ({
  name,
  fn,
  override,
})
export const createTransformNodeEntry = (key: string, from: NodeType, pattern: Match.Pattern, to: TransformNodeEntry[`to`]): TransformNodeEntry => ({ key, from, pattern, to })

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

export function createRecontextualizationEntry(key: string, from: NodeType, pattern: Match.Pattern, reContextualization: RecontextualizationEntry[`reContextualization`]): RecontextualizationEntry {
  return { key, from, pattern, reContextualization }
}
