import { AnyObject, MaybeArray, Nullable } from "tsdef"
import { Entries } from "type-fest"

import { Match } from "@december/utils"

import { TokenKind } from "../../token"
import { Node, NodeType } from "../../tree"
import { BindingPower } from "./bindingPower"
import { ParserFunction, SyntacticalContext, SyntacticalDenotation } from "./parserFunction"
import { GetFunction, GetKey } from "../../utils"

export interface BindingPowerEntry<TKind extends string> {
  denotation: SyntacticalDenotation
  kind: TKind
  bindingPower: BindingPower
}

export interface RegisterParserEntry<TDict> {
  name: GetKey<TDict>
  fn: GetFunction<TDict>
  override?: boolean
}

export interface BindParserEntry<TDict, TKind extends string> {
  denotation: SyntacticalDenotation
  kind: TKind
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

export type SyntacticalGrammarEntry<TDict, TKind extends string> = BindingPowerEntry<TKind> | RegisterParserEntry<TDict> | BindParserEntry<TDict, TKind> | TransformNodeEntry | RecontextualizationEntry

export function isBindingPowerEntry(entry: SyntacticalGrammarEntry<any, any>): entry is BindingPowerEntry<any> {
  return `bindingPower` in entry && !(`parser` in entry)
}

export function isBindParserEntry<TDict>(entry: SyntacticalGrammarEntry<any, any>): entry is BindParserEntry<TDict, any> {
  return `parser` in entry && `kind` in entry
}

export function isRegisterParserEntry<TDict>(entry: SyntacticalGrammarEntry<any, any>): entry is RegisterParserEntry<TDict> {
  return `fn` in entry && !(`kind` in entry)
}

export function isTransformNodeEntry(entry: SyntacticalGrammarEntry<any, any>): entry is TransformNodeEntry {
  return `pattern` in entry && `from` in entry && `to` in entry
}

export function isReContextualizationEntry(entry: SyntacticalGrammarEntry<any, any>): entry is RecontextualizationEntry {
  return `reContextualization` in entry
}

export const createBindingPowerEntry = <TKind extends string>(denotation: SyntacticalDenotation, kind: TKind, bindingPower: BindingPower): BindingPowerEntry<TKind> => ({ denotation, kind, bindingPower })
export const createRegisterParserEntry = <TDict>(name: GetKey<TDict>, fn: GetFunction<TDict>, override: boolean = false): RegisterParserEntry<TDict> => ({
  name,
  fn,
  override,
})
export const createTransformNodeEntry = (key: string, from: NodeType, pattern: Match.Pattern, to: TransformNodeEntry[`to`]): TransformNodeEntry => ({ key, from, pattern, to })

export function createBindParserEntry<TDict, TKind extends string>(denotation: `statement`, kind: TKind, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict, TKind>
export function createBindParserEntry<TDict, TKind extends string>(denotation: `nud`, kind: TKind, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict, TKind>
export function createBindParserEntry<TDict, TKind extends string>(denotation: `led`, kind: TKind, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict, TKind>
export function createBindParserEntry<TDict, TKind extends string>(denotation: SyntacticalDenotation, kind: TKind, bindingPower: BindingPower, parser: GetKey<TDict>): BindParserEntry<TDict, TKind> {
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
