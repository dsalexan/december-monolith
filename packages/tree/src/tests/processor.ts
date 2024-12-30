import { SyntacticalContext } from "./../parser/grammar/parserFunction"
import { has, get } from "lodash"
import { Nullable } from "tsdef"
import assert from "assert"

import { EQUALS, REGEX } from "@december/utils/match/element"
import { DICE_MODULAR_EVALUATOR_PROVIDER, DICE_MODULAR_SYNTACTICAL_GRAMMAR, DICE_MODULAR_REWRITER_RULESET } from "@december/system/dice"

import { UnitManager, BASE_UNITS, DICE } from "./unit"

import {
  DEFAULT_GRAMMAR as DEFAULT_LEXICAL_GRAMMAR,
  Lexer,
  LexicalGrammar,
  printExpressionHeader,
  //
  Parser,
} from ".."

import { createTransformNodeEntry, SyntacticalGrammar } from "../parser/grammar"
import { DEFAULT_GRAMMAR as DEFAULT_SYNTACTICAL_GRAMMAR } from "../parser/grammar/default"

import Interpreter, { NumericValue, DEFAULT_EVALUATOR, Environment, NodeEvaluator, RuntimeValue, VariableValue, FunctionValue, BooleanValue, ObjectValue } from "../interpreter"
import Rewriter, { GraphRewritingSystem, DEFAULT_GRAPH_REWRITING_RULESET } from "../rewriter"
import { SymbolTable } from "../symbolTable"

import Processor from "../processor"
import { createEntry, KEYWORD_PRIORITY } from "../lexer/grammar"
import { Identifier, MemberExpression, StringLiteral } from "../tree"
import { makeConstantLiteral, makeToken } from "../utils/factories"

let expression = `10 + 2 * 3`
expression = `One::level`
expression = `"SK:Teste One::level"`
expression = `@itemhasmod(Feet Only)`
expression = `@itemhasmod(0, Feet Only)`
expression = `(10)`
expression = `( 10 + b)`
expression = `(10 + b) * 3x `
expression = `10 * 3 + 6`
expression = `[2d6 * d6]`
expression = `(10 + b) * 3x + [2d6 * d6] / "ST:DX::level"`
expression = `@if(1 = b then Are Strings Glued? else self)`
expression = `2 d6kh1kl0`
expression = `20 + d6`
// expression = `"string test"`
// expression = `"string test else"`
expression = `@if(10 + b then "else" else [2d6 * d6 + "then"] / "ST:DX::level")`
expression = `@if(10 + b then [2d6 + d6] else "ST:DX")`
expression = `"AD:Claws (Blunt Claws)::level"`
expression = `AD:Claws (Blunt Claws)`
expression = `$if(@itemhasmod(AD:Claws (Talons), Feet Only) = 0 THEN 1 ELSE 0)`
expression = `2d6 - 1`
expression = `(2d6 - 1) + 0`
expression = `((2d6 - 1) + 0) + 0`
//
expression = `$solver(%level)d`
expression = `$solver($eval(%level))d + $solver(%level)`
expression = `$if("AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0 THEN "cut" ELSE $if("AD:Claws (Talons)::level" = 1  & @itemhasmod(AD:Claws (Talons), Feet Only) = 0 THEN "cut/imp" ELSE $if("AD:Claws (Long Talons)::level" = 1  & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 THEN "cut/imp" ELSE "cr")))`
expression = `me::strength::minimum`
expression = `me::weaponst`
// expression = `2 * 1`
// expression = `0 + 1 + 2 * 1`
// expression = `3 / 3`
// expression = `(4 * (b + d)) / 4`
// expression = `(2 * 5) + 5`
// expression = `(3 + 7) + 3` // (_1 + _2) + _1 -> (_1 + 2) * _2
// expression = `(o * t) + (th * t)` // (_1 * _2) + (_3 * _2) -> (_1 + _3) * _2
// expression = `((t * o) - 7) - 8` // (_NonLiteral - _Literal1) - _Literal2 -> _NonLiteral - (_Literal1 + _Literal2)
// expression = `5 + 1`
// expression = `2d6 + 5 + b`
// expression = `2d6 + 5 - 1d6`
// expression = `@if(@itemhasmod(AD:Flight, "Feet Only") then 99 else 10)`
// expression = `` // (_NonLiteral1 + _Literal) - _NonLiteral2 -> (_NonLiteral1 - _NonLiteral2) + _Literal       {C}
// expression = `7 + ((b * c) + 3)`

expression = expression.replaceAll(/(\r\n|\n|\r) */gm, ``)

const unitManager = new UnitManager()
unitManager.add(...BASE_UNITS)
// unitManager.add(...DICE)

const lexicalGrammar = new LexicalGrammar()
lexicalGrammar.add(...DEFAULT_LEXICAL_GRAMMAR)

const syntacticalGrammar = new SyntacticalGrammar(unitManager)
syntacticalGrammar.add(...DEFAULT_SYNTACTICAL_GRAMMAR)
syntacticalGrammar.add(...DICE_MODULAR_SYNTACTICAL_GRAMMAR)
syntacticalGrammar.add(createTransformNodeEntry(`b`, `StringLiteral`, EQUALS(`b`), `Identifier`))
syntacticalGrammar.add(createTransformNodeEntry(`t`, `StringLiteral`, EQUALS(`t`), `Identifier`))
syntacticalGrammar.add(createTransformNodeEntry(`o`, `StringLiteral`, EQUALS(`o`), `Identifier`))
syntacticalGrammar.add(createTransformNodeEntry(`me`, `StringLiteral`, EQUALS(`me`), `Identifier`))
syntacticalGrammar.add(createTransformNodeEntry(`alias`, `StringLiteral`, REGEX(/^"?\w{2}:.+"?$/), `Identifier`))
syntacticalGrammar.add(createTransformNodeEntry(`me_level`, `StringLiteral`, EQUALS(`%level`, true), `Identifier`))
syntacticalGrammar.add(
  createTransformNodeEntry(`me_weaponst`, `MemberExpression`, EQUALS(`me->weaponst`, true), (memberExpression: MemberExpression) => {
    const me_modes = new MemberExpression(memberExpression.object, makeConstantLiteral(`modes`))
    const modes_current = new MemberExpression(me_modes, new Identifier(makeToken(`modeIndex`)))
    const mode_strength = new MemberExpression(modes_current, makeConstantLiteral(`strength`))
    return new MemberExpression(mode_strength, makeConstantLiteral(`minimum`))
  }),
)

const graphRewritingSystem = new GraphRewritingSystem()
graphRewritingSystem.add(...DEFAULT_GRAPH_REWRITING_RULESET)
graphRewritingSystem.add(...DICE_MODULAR_REWRITER_RULESET)

const nodeEvaluator = new NodeEvaluator()
nodeEvaluator.addDictionaries(DEFAULT_EVALUATOR)
nodeEvaluator.addDictionaries(DICE_MODULAR_EVALUATOR_PROVIDER, true)

const environment = new Environment(`root`)

const ME = { level: 15, modes: [{ strength: { minimum: 9 } }] }
environment.assignValue(`me`, new ObjectValue(ME, { numberValue: ME.level }))
environment.assignValue(`modeIndex`, new NumericValue(0))

// environment.assignValue(`b`, new NumericValue(-10))
// environment.assignValueToPattern(`alias`, REGEX(/^"?\w{2}:.+"?$/), new NumericValue(0))
environment.assignValueToPattern(`alias`, REGEX(/^"?\w{2}:.+"?$/), new VariableValue(`alias::fallback`))
environment.assignValue(`alias::fallback`, new ObjectValue({}, { numberValue: 0 }))
environment.assignValue(`@itemhasmod`, new FunctionValue(() => () => new BooleanValue(true), `@itemhasmod`))
environment.assignValue(`%level`, new NumericValue(10))

const processor = new Processor(lexicalGrammar, syntacticalGrammar, graphRewritingSystem, nodeEvaluator)

printExpressionHeader(expression)

const syntacticalContext: SyntacticalContext = { mode: `expression` }
const symbolTable = new SymbolTable()

const { originalExpression, tokens, injections, AST } = processor.parse(expression, environment, symbolTable, { debug: true, syntacticalContext })
assert(AST, `Failed to parse expression.`)
const { originalContent, content, evaluation, isReady } = processor.resolve(AST, environment, symbolTable, {
  debug: true,
  syntacticalContext,
  isValidFunctionName: (functionName: string) => functionName.startsWith(`@`),
  environmentUpdateCallback: (environment, symbolTable) => {
    // const missingSymbols = symbolTable.getMissingSymbols(environment)
    const allSymbols = symbolTable.getAllSymbols(environment) // we are ALWAYS looking to update any symbol present in table, making this reactive would be a pain

    for (const symbol of allSymbols) {
      let value: Nullable<RuntimeValue<any>> = null

      if (symbol.name === `alias::fallback`) value = new NumericValue(0)

      if (value === null) continue
      // TODO: Search somewhere for correspondent value

      if (value !== null) environment.assignValue(symbol.name, value, true)

      if (value === null && !!environment.resolve(symbol.name)?.environment) debugger // TODO: What to do if a value suddenly vanishes?
    }
  },
})
