/**
 * EXPRESSION TO TREE PIPELINE
 *
 * 1. LEXER
 *    - Tokenization
 *    - Lexical Analysis
 *    - Split expression into tokens (a pair "value" and "type", qualifying the meaning of each substring)
 *
 * 2. PARSER
 *    - Syntactic Analysis
 *    - Build an Abstract Syntax Tree (AST) from the tokens
 *
 * Unaddressed phases:
 *  - Semantic Analysis — Is it necessary? Is it not just a type checking?
 *  - Simplification
 *  - Reduction
 */

import { range } from "lodash"
import logger, { paint } from "./logger"

export { default as Lexer, LexicalGrammar, LexicalGrammarMatch, DEFAULT_GRAMMAR } from "./lexer"
export { default as Parser } from "./parser"

/** Prints expression as header */
export function printExpressionHeader(expression: string) {
  console.log(` `)
  const N = expression.length
  const M = Math.ceil(Math.log10(N))
  logger
    .add(
      paint.gray(
        range(0, N)
          .map(i => String(i).padStart(M))
          .join(` `),
      ),
    )
    .info()
  logger.add(paint.gray([...expression].map(c => c.padStart(M)).join(` `))).info()
}
