/**
 *
 *
 *
 *
 */

import { range } from "lodash"

import logger, { paint } from "./logger"

import Grammar from "./type/grammar"
import Lexer from "./phases/lexer"
import Parser from "./phases/parser"
import Semantic from "./phases/semantic"

import { LITERALS, NUMBER, STRING } from "./type/declarations/literal"
import { OPERATORS } from "./type/declarations/operator"
import { DEFAULT_SEPARATORS, SEPARATORS } from "./type/declarations/separator"
import { WHITESPACES } from "./type/declarations/whitespace"
import { COMPOSITES } from "./type/declarations/composite"

let expression = `1 + 2`
expression = `1 a`
expression = `1 + 2 * 3`
expression = `1 + 2 + 3`
expression = `(1)`
expression = `(1 + 2)`
expression = `(1 + 2) + 3`
expression = `"1 + 2" + 3`
expression = `"1 + teste"`
expression = `"1 + teste" + [3 * 4]`
expression = `1  <= 5`
expression = `2 ** 3`
expression = `-10`
expression = `(100000+)`
expression = `11111111+22222222`
expression = `11111111 + 22222222`
expression = `1 + 2`
expression = `-10`
expression = `teste, 1, ok`
expression = `teste,`
expression = `,teste`
expression = ` 1`
expression = ` , 1`
expression = `[ 1] `
expression = `,1,2,`
expression = `teste, [1,2,3],`
expression = `teste, 1 + 3, A24, -10, [1, 2, 3,], 10 >= 1`
expression = `teste, 1 ; 2 | 1, 3`
expression = `teste, 1 ;, 2 | 1, 3`
expression = `teste , 1.10, 1,5,  "inside ,quotes", fn(arg0, ..., argN)`
expression = `[1]a`
expression = `fn(), test`
expression = `fn(1,2)`
expression = `fn1(), fn2(1), fn3(1,2)`

const grammar = new Grammar()
grammar.add(...WHITESPACES)
grammar.add(...LITERALS)
grammar.add(...SEPARATORS)
grammar.add(...DEFAULT_SEPARATORS)
grammar.add(...OPERATORS)
grammar.add(...COMPOSITES)

grammar.print()

const lexer = new Lexer(grammar)
const parser = new Parser(grammar)
const semantic = new Semantic(grammar)

// 1. Print expression
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
console.log(` `)

lexer.process(expression)
lexer.print()

parser.process(expression, lexer.tokens)
parser.print({
  sequence: {
    // minimumSizeForBracket: 0,
    // minimumSizeForPipe: 1,
    // padding: { character: `‾` },
    // spacing: { character: `.` },
    // filling: { character: `▮` },
  },
  style: {},
})

semantic.process(expression, parser.AST)
semantic.print({})
