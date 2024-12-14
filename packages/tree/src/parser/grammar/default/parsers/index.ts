import { Merge } from "type-fest"
import { DEFAULT_EXPRESSION_PARSERS, DefaultExpressionParserFunctionIndex } from "./expression"
import { DEFAULT_STATEMENT_PARSERS, DefaultStatementParserFunctionIndex } from "./statement"

export type DefaultParserFunctionIndex = Merge<DefaultExpressionParserFunctionIndex, DefaultStatementParserFunctionIndex>
export const DEFAULT_PARSERS = { ...DEFAULT_EXPRESSION_PARSERS, ...DEFAULT_STATEMENT_PARSERS } as DefaultParserFunctionIndex
