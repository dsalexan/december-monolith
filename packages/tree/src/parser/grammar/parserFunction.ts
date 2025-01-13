import type { Expression, Node, Statement, StringLiteral } from "../../tree"

import type Parser from ".."

import { BindingPower } from "./bindingPower"
import { Merge } from "type-fest"

export type SyntaxMode = `expression` | `text` | string
export type SyntacticalContext = { mode: SyntaxMode }

export type SyntacticalDenotation = `statement` | `nud` | `led`

export type StatementParser = (p: Parser, context: SyntacticalContext) => Expression
export type NUDParser = (p: Parser, context: SyntacticalContext) => Expression
export type LEDParser = (p: Parser, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext) => Expression

// specifically for parseStatement and parseExpression (entry level parsers)
export type EntryParser<TEntry> = (p: Parser, minimumBindingPower: BindingPower, context: SyntacticalContext) => TEntry

export type ParserFunction = StatementParser | NUDParser | LEDParser
