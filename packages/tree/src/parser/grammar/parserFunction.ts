import { Merge } from "type-fest"
import { AnyObject } from "tsdef"

import type { Expression, Node, Statement, StringLiteral } from "../../tree"

import type Parser from ".."

import { BindingPower } from "./bindingPower"
import { TokenKind } from "../../token"

export type SyntaxMode = `expression` | `text` | string
export type SyntacticalContext = { mode: SyntaxMode; alternativeEOF?: TokenKind[]; localAlternativeEOF?: TokenKind[] }

export type SyntacticalDenotation = `statement` | `nud` | `led`

export type StatementParser = (p: Parser, context: SyntacticalContext) => Expression
export type NUDParser = (p: Parser<any, any>, context: SyntacticalContext) => Expression
export type LEDParser = (p: Parser<any, any>, left: Expression, minimumBindingPower: BindingPower, context: SyntacticalContext) => Expression

// specifically for parseStatement and parseExpression (entry level parsers)
export type EntryParser<TEntry> = (p: Parser<any, any>, minimumBindingPower: BindingPower, context: SyntacticalContext) => TEntry

export type ParserFunction = StatementParser | NUDParser | LEDParser
