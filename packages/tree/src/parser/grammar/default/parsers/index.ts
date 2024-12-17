import { Merge } from "type-fest"
import { DEFAULT_EXPRESSION_PARSERS, DefaultExpressionParserProvider } from "./expression"
import { DEFAULT_STATEMENT_PARSERS, DefaultStatementParserProvider } from "./statement"

export type DefaultParserProvider = Merge<DefaultExpressionParserProvider, DefaultStatementParserProvider>
export const DEFAULT_PARSERS = { ...DEFAULT_EXPRESSION_PARSERS, ...DEFAULT_STATEMENT_PARSERS } as DefaultParserProvider
