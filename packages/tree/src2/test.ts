/**
 *
 *
 *
 *
 */

import { range } from "lodash"

import logger, { paint } from "./logger"

import { StringProvider } from "./string"
import Grammar from "./type/grammar"
import Lexer from "./phases/lexer"
import Parser from "./phases/parser"
import Semantic, { NRS as SemanticNRS } from "./phases/semantic"
import Simplify, { NRS as SimplifyNRS } from "./phases/simplify"
import Reducer from "./phases/reducer"
import Resolver from "./phases/resolver"

import { LITERALS, NUMBER, STRING } from "./type/declarations/literal"
import { OPERATORS, DEFAULT_OPERATORS, ALGEBRAIC_OPERATORS } from "./type/declarations/operator"
import { DEFAULT_SEPARATORS, SEPARATORS } from "./type/declarations/separator"
import { ENCLOSURES } from "./type/declarations/enclosure"
import { WHITESPACES } from "./type/declarations/whitespace"
import { KEYWORDS } from "./type/declarations/keyword"

import { defaultProcessingOptions } from "./options"
import Environment from "./environment"

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
//
expression = ` 0+1`
expression = `2+1`
expression = `1, "inside ,quotes", 2`
expression = `"inside ,quotes"`
expression = `1 = 2 + 3`
expression = `10=0-999`
expression = `1+0`
expression = `(1/2) + 0`
expression = `1*20`
expression = `20*1`
expression = `1+3`
expression = `3+3`
expression = `(10 + 5)`
expression = `(10 + 5) + (10 + 5)`
expression = `20-20`
expression = `20-10.5`
expression = `10=0-999`
// expression = `10 * 5 - 10 * 5`
expression = `1*+2`
expression = `1*-2`
expression = `10=(0-10)*-1`
expression = `0+(1 + a)`
//
//
expression = `(")`
expression = `("")`
expression = `fn(0)`
expression = `(-1)`
expression = `fn(-1 )`
expression = `-1`
expression = `-0+1`
expression = `0+-1`
expression = `fn(-0 + "1")`
expression = `1=0+1`
//
expression = `0+1`
expression = `9999=0-(X * 100)`
expression = `2+0`
expression = `1*(X-300)`
expression = `(X-199)*1`
expression = `(X-2)+(X-2)`
// expression = `(X-2)-(X-2)`
expression = `if(1=2 then 9999 else 0+(X+2))`
expression = `"SK:Br awling::level"`
expression = `if("SK:Br awling::level" > 10 then 1 else 0+(X+2))`
expression = `1 +2-fn(x)`
expression = `1 + -fn(x)`
expression = `1 + -2`
expression = `1 + fn(1) + 1`
expression = `1 + if(15 > 10 then 1 else 2) + -@if(10 then 9 else 0)`
expression = `monster fn(1) bastard`
expression = `thr-1 + @if("SK:Brawling::level" > ST:DX+1 then @basethdice(ST:Bite) else 0) + -@if("DI:Weak Bite::level" = 1 then 2 * @basethdice(ST:Bite) else 0)`
expression = `(1 + 2) + 3)`
expression = `$if(1 THEN 9 ELSE $if(0 THEN 3 ELSE 8))`
expression = `$if(1 THEN 9 ELSE $if("AD:Vampiric Bite::level" = 1 THEN "cut" ELSE "cr"))`
expression = `$if("AD:Teeth (Fangs)::level" = 1 THEN "imp" ELSE $if("AD:Vampiric Bite::level" = 1 THEN "cut" ELSE "cr"))`
expression = `$if("AD:Teeth (Sharp Beak)::level" = 1 THEN "pi+" ELSE $if("AD:Teeth (Fangs)::level" = 1 THEN "imp" ELSE $if("AD:Vampiric Bite::level" = 1 THEN "cut" ELSE "cr")))`
expression = `$if("AD:Teeth (Sharp Teeth)::level" = 1 THEN "cut" ELSE $if("AD:Teeth (Sharp Beak)::level" = 1 THEN "pi+" ELSE $if("AD:Teeth (Fangs)::level" = 1 THEN "imp" ELSE $if("AD:Vampiric Bite::level" = 1 THEN "cut" ELSE "cr"))))`
//
expression = `1 + SK:Teste`

const options = defaultProcessingOptions({
  // general
  scope: { root: `math` },
  //
  reducer: {
    ignoreTypes: [`conditional`],
  },
  resolver: {
    SimplifyNRS,
  },
})

const grammar = new Grammar()
grammar.add(...WHITESPACES)
grammar.add(...LITERALS)
// grammar.add(...SEPARATORS)
grammar.add(...DEFAULT_SEPARATORS)
grammar.add(...ENCLOSURES)
grammar.add(...OPERATORS)
grammar.add(...KEYWORDS)

grammar.print()

const lexer = new Lexer(grammar)
const parser = new Parser(grammar)
const semantic = new Semantic(grammar)
const simplify = new Simplify(grammar)
const reducer = new Reducer(grammar)
const resolver = new Resolver(simplify, reducer)

const environment = new Environment()
environment.addObjectSource(`test`, {
  //                               literal:string_collection,
  "AD:Teeth (Sharp Teeth)::level": `level`, // S4.a,
  //                              literal:string_collection,
  "AD:Teeth (Sharp Beak)::level": 1, // S6.a,
  //                         literal:string_collection,
  "AD:Teeth (Fangs)::level": 1, // S8.a,
  //                         literal:string_collection,
  "AD:Vampiric Bite::level": 1, // S10.a,
})

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

parser.process(expression, lexer.tokens, options.parser)
parser.print({
  expression,
  sequence: {
    // minimumSizeForBracket: 0,
    // minimumSizeForPipe: 1,
    // padding: { character: `‾` },
    // spacing: { character: `.` },
    // filling: { character: `▮` },
  },
  style: {},
  // headers: false,
  // name: false,
})

semantic.process(parser.AST, SemanticNRS, options.semantic)
semantic.print({ expression })

// environment.print()

// simplify.process(semantic.ST, environment, SimplifyNRS, options.simplify)
// simplify.print({ expression: simplify.SST.expression() })
// console.log(` `)

// reducer.process(simplify.SST, environment, options.reducer)
// reducer.print({ expression: reducer.RT.expression() })

// resolver.process(semantic.ST, environment, options.resolver)
// resolver.print({ expression: resolver.result.expression() })
