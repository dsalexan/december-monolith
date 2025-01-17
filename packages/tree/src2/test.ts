/**
 *
 *
 *
 *
 */

import { range } from "lodash"

// import { defaultUnitManager } from "@december/system"

import logger, { paint } from "./logger"

import { UnitManager, BASE_UNITS, DICE } from "./unit"

import { StringProvider } from "./string"
import Grammar from "./type/grammar"
import Lexer from "./phases/lexer"
import Parser from "./phases/parser"
import Semantic, { RULESET_SEMANTIC } from "./phases/semantic"
import Simplify, { RULESETS_SIMPLIFY } from "./phases/simplify"
import Reducer from "./phases/reducer"
import Resolver from "./phases/resolver"

import { LITERALS, NUMBER, STRING } from "./type/declarations/literal"
import { OPERATORS, DEFAULT_OPERATORS, ALGEBRAIC_OPERATORS } from "./type/declarations/operator"
import { DEFAULT_SEPARATORS, SEPARATORS } from "./type/declarations/separator"
import { ENCLOSURES } from "./type/declarations/enclosure"
import { WHITESPACES } from "./type/declarations/whitespace"
import { KEYWORDS } from "./type/declarations/keyword"

import { defaultProcessingOptions } from "./options"
import Environment, { ObjectSource, SymbolTable } from "./environment"
import { NodeFactory } from "./node"

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
expression = `10 kg`
expression = `-10 kg`
expression = `10kg -10 kg`
expression = `10kg +15 kg`
expression = `X + 10kg`
expression = `5 * 10kg`
expression = `10kg * 5`
expression = `10 kg + x`
expression = `10 kg + x kg`
expression = `10 kg + 20kg + x kg`
expression = `10 kg + -30 kg`
expression = `20+x`
expression = `10 + (20 + x)`
expression = `-20 + x + 40`
expression = `10 + 30 + x + -20`
expression = `10 kg + 20kg + x kg + -30 kg `
expression = `10 kg + 20kg + x kg + -30 kg + -40kg + kg`
//
expression = `d6 + 1d4`
expression = `d6 + 10d6`
//
expression = `@fn(1, 2, 3)`
expression = `"10 + 1"`
expression = `10 + 1`
expression = `"A A" = 1`
expression = `if("A A" = 1 & @fn(B, C) = 0 THEN "D" ELSE "E")`
expression = `Claws (Long Talon)`
expression = `Claws (Long @modgets(Talon, Clw))`
expression = `Claws (Long (Talon, Clw))`
expression = `@fn(A B)`
expression = `@itemhasmod(AD:Claws (Long Talons), Feet Only) = 0`
expression = `$if("AD:Claws (Long Talons)::level" = 1  & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 THEN "cut/imp" ELSE "cr")`
// expression = `$if("AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0 THEN "cut" ELSE $if("AD:Claws (Talons)::level" = 1  & @itemhasmod(AD:Claws (Talons), Feet Only) = 0 THEN "cut/imp" ELSE $if("AD:Claws (Long Talons)::level" = 1  & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 THEN "cut/imp" ELSE "cr")))`
expression = `$if(1 = 1 & 2 = 0 THEN "cut" ELSE "cr")`
expression = `$if(B = 1 & @itemhasmod(B, Feet) = 0 THEN "cut/imp" ELSE "cr")`
expression = `$if(A = 1 THEN "cut" ELSE $if(B = 1 THEN "imp" ELSE "cr"))`
expression = `$if(A = 1 & 2 = 0 THEN "cut" ELSE $if(B = 1 & 3 = 0 THEN "cut/imp" ELSE "cr"))`
expression = `$if(A = 1 & @itemhasmod(A, Feet) = 0 THEN "cut" ELSE $if(B = 1 & @itemhasmod(B, Feet) = 0 THEN "cut/imp" ELSE "cr"))`
expression = `$if("A::level" = 1 & @itemhasmod(A, Feet) = 0 THEN "cut" ELSE $if("B::level" = 1 & @itemhasmod(B, Feet) = 0 THEN "cut/imp" ELSE "cr"))`
expression = `$if("A::level" = 1 & @itemhasmod(A, Feet Only) = 0 THEN "cut" ELSE $if("B::level" = 1 & @itemhasmod(B, Feet Only) = 0 THEN "cut/imp" ELSE "cr"))`
expression = `$if("AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0 THEN "cut" ELSE $if("AD:Claws (Talons)::level" = 1 & @itemhasmod(AD:Claws (Talons), Feet Only) = 0 THEN "cut/imp" ELSE "cr"))`
expression = `$if("AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0 THEN "cut" ELSE $if("AD:Claws (Talons)::level" = 1 & @itemhasmod(AD:Claws (Talons), Feet Only) = 0 THEN "cut/imp" ELSE $if("AD:Claws (Long Talons)::level" = 1 & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 THEN "cut/imp" ELSE "cr")))`
//
expression = `-@basethdice(ST:Kick)`
expression = `@if(A = 1 then -@basethdice(ST:Kick) else 0)`
expression = `@if(1 = 1 
  then @if(2 = 1 
    then 0 
    else 1
  ) 
  else 0
)`
expression = `thr+ 
@if(me::level = ST:DX 
  then @basethdice(ST:Kick) 
  else @if(me::level > ST:DX 
    then 2 * @basethdice(ST:Kick) 
    else 0
  )
)`
expression = `thr+ 
@if(me::level = ST:DX 
  then @basethdice(ST:Kick) 
  else @if(me::level > ST:DX 
    then 2 * @basethdice(ST:Kick) 
    else 0
  )
) + 
@if("DI:Horizontal::level" = 1 
  then @if("AD:Claws (Blunt Claws)::level" = 1 
    then 0 
    else @if("AD:Claws (Sharp Claws)::level" = 1 
      then 0 
      else @if("AD:Claws (Talons)::level" = 1 
        then 0 
        else @if("AD:Claws (Long Talons)::level" = 1 
          then 0 
          else @basethdice(ST:Kick)
        )
      )
    )
  ) 
  else 0
) + 
@if("AD:Claws (Blunt Claws)::level" = 1 & @itemhasmod(AD:Claws (Blunt Claws), Hands Only) = 0 
  then @basethdice(ST:Kick) 
  else @if("AD:Claws (Long Talons)::level" = 1 & @itemhasmod(AD:Claws (Long Talons), Hands Only) = 0 
    then @basethdice(ST:Kick) 
    else @if("AD:Claws (Hooves)::level" = 1 
      then @basethdice(ST:Kick) 
      else 0
    )
  )
)`
expression = `B + 1 * 2`
expression = `@if(A = B+1 
  THEN @fn(P) 
  ELSE @if(A > B+1 
    THEN 2 * @fn(P) 
    ELSE 0
  )
)`
expression = `thr-1 + 
@if("AD:Claws (Blunt Claws)::level" = 1 & @itemhasmod(AD:Claws (Blunt Claws), Feet Only) = 0 
  then @basethdice(ST:Punch) 
  else @if("AD:Claws (Long Talons)::level" = 1 & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 
    then @basethdice(ST:Punch) 
    else 0
  )
) + 
@max(
  @if("SK:Brawling::level" > ST:DX+1 
    then @basethdice(ST:Punch) 
    ELSE 0
  ),
  @if("SK:Boxing::level" = ST:DX+1 
    then @basethdice(ST:Punch) 
    ELSE @if("SK:Boxing::level" > ST:DX+1 
      then 2 * @basethdice(ST:Punch) 
      ELSE 0
    )
  ),
  @if("SK:Karate::level" = ST:DX 
    then @basethdice(ST:Punch) 
    ELSE @if("SK:Karate::level" > ST:DX 
      then 2 * @basethdice(ST:Punch) 
      ELSE 0
    )
  )
)`
expression = `thr-1 + @if("AD:Claws (Blunt Claws)::level" = 1 & @itemhasmod(AD:Claws (Blunt Claws), Feet Only) = 0 then @basethdice(ST:Punch) else @if("AD:Claws (Long Talons)::level" = 1 & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 then @basethdice(ST:Punch) else 0)) + @max(@if("SK:Brawling::level" > ST:DX+1 then @basethdice(ST:Punch) ELSE 0),@if("SK:Boxing::level" = ST:DX+1 then @basethdice(ST:Punch) ELSE @if("SK:Boxing::level" > ST:DX+1 then 2 * @basethdice(ST:Punch) ELSE 0)),@if("SK:Karate::level" = ST:DX then @basethdice(ST:Punch) ELSE @if("SK:Karate::level" > ST:DX then 2 * @basethdice(ST:Punch) ELSE 0)))`

expression = expression.replaceAll(/(\r\n|\n|\r) */gm, ``)
const options = defaultProcessingOptions({
  // general
  scope: `math-enabled`,
  debug: true,
  //
  simplify: {
    rulesets: RULESETS_SIMPLIFY,
  },
  reducer: {
    ignoreTypes: [],
    includesFallback: true,
  },
})

const nodeFactory = new NodeFactory({ masterScope: options.scope })

const unitManager = new UnitManager()
unitManager.add(...BASE_UNITS)
unitManager.add(...DICE)

const grammar = new Grammar(unitManager)
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
const source = new ObjectSource(`test`)
source.addMatchEntry(
  {
    name: `fallback::trait:level:any`,
    fallback: true,
    value: { type: `simple`, value: 0 },
  },
  identifier => {
    function isAlias(value: string) {
      return /^\w{2}\:[\w" \(\)\,\;\s]+$/.test(value)
    }

    if (isAlias(identifier.name)) return true
    if (identifier.name === `SK:Karate::level`) return true
    return false
  },
)

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

semantic.process(parser.AST, [RULESET_SEMANTIC], options.semantic)
semantic.print({ expression })

const symbolTable = SymbolTable.from(`semantic`, semantic.ST, { scope: options.scope })

// environment.print()

// simplify.process(semantic.ST, environment, [...RULESETS_SIMPLIFY], options.simplify)
// simplify.print({ expression: simplify.SST.expression() })
// console.log(` `)

// reducer.process(simplify.SST, environment, options.reducer)
// reducer.print({ expression: reducer.RT.expression() })

resolver.process(semantic.ST, symbolTable, environment, options.resolver)
resolver.print({ expression: resolver.result.expression() })
