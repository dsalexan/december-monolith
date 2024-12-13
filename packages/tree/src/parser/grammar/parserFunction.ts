import type { Expression } from "../../tree"

import type Parser from ".."

import { BindingPower } from "./bindingPower"

export type SyntaxMode = `expression` | `string`
export type SyntacticalContext = { mode: SyntaxMode }

export type SyntacticalDenotation = `statement` | `nud` | `led`

export type StatementParser = (p: Parser, context: SyntacticalContext) => Expression
export type NUDParser = (p: Parser, context: SyntacticalContext) => Expression
export type LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext) => Expression

export type ParserFunction = StatementParser | NUDParser | LEDParser

// specifically for parseStatement and parseExpression (entry level parsers)
export type EntryParser<TEntry> = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext) => TEntry
