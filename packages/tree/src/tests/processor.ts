import { EQUALS, REGEX } from "@december/utils/match/element"

import { UnitManager, BASE_UNITS, DICE } from "./unit"

import {
  DEFAULT_GRAMMAR as DEFAULT_LEXICAL_GRAMMAR,
  Lexer,
  LexicalGrammar,
  printExpressionHeader,
  //
  Parser,
} from ".."

import { createReTyperEntry, SyntacticalGrammar } from "../parser/grammar"
import { DEFAULT_GRAMMAR as DEFAULT_SYNTACTICAL_GRAMMAR } from "../parser/grammar/default"

import Interpreter, { NumericValue, DEFAULT_EVALUATOR, Environment, NodeEvaluator, RuntimeValue, VariableValue } from "../interpreter"
import { DICE_MODULAR_EVALUATOR_PROVIDER, DICE_MODULAR_SYNTACTICAL_GRAMMAR, DICE_RULESET } from "../_custom/dice"
import Rewriter, { GraphRewritingSystem, DEFAULT_GRAPH_REWRITING_RULESET } from "../rewriter"
import Processor from "../processor"
import { SymbolTable } from "../symbolTable"
import { Nullable } from "tsdef"

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
//
expression = `2 * 1`
expression = `0 + 1 + 2 * 1`
expression = `3 / 3`
expression = `(4 * (b + d)) / 4`
expression = `(2 * 5) + 5`
expression = `(3 + 7) + 3` // (_1 + _2) + _1 -> (_1 + 2) * _2
expression = `(o * t) + (th * t)` // (_1 * _2) + (_3 * _2) -> (_1 + _3) * _2
expression = `((t * o) - 7) - 8` // (_NonLiteral - _Literal1) - _Literal2 -> _NonLiteral - (_Literal1 + _Literal2)
expression = `5 + 1`
expression = `2d6 + 5 + b`
expression = `2d6 + 5 - 1d6`
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
syntacticalGrammar.add(createReTyperEntry(`b`, `Identifier`, EQUALS(`b`)))
syntacticalGrammar.add(createReTyperEntry(`t`, `Identifier`, EQUALS(`t`)))
syntacticalGrammar.add(createReTyperEntry(`o`, `Identifier`, EQUALS(`o`)))
syntacticalGrammar.add(createReTyperEntry(`self`, `Identifier`, EQUALS(`self`)))
syntacticalGrammar.add(createReTyperEntry(`alias`, `Identifier`, REGEX(/^\w{2}::.+$/)))

const graphRewritingSystem = new GraphRewritingSystem()
graphRewritingSystem.add(...DEFAULT_GRAPH_REWRITING_RULESET)
graphRewritingSystem.add(...DICE_RULESET)

const nodeEvaluator = new NodeEvaluator()
nodeEvaluator.addDictionaries(DEFAULT_EVALUATOR)
nodeEvaluator.addDictionaries(DICE_MODULAR_EVALUATOR_PROVIDER, true)

const symbolTable = new SymbolTable()

const environment = new Environment(`root`)
// environment.assignValue(`b`, { type: `number`, value: 2 })
environment.assignValue(`self`, new NumericValue(15))
// environment.assignValueToPattern(`alias`, REGEX(/^\w{2}::.+$/), new VariableValue(`alias::fallback`))
environment.assignValueToPattern(`alias`, REGEX(/^\w{2}::.+$/), new NumericValue(0))
// environment.assignValue(`alias::fallback`, new NumericValue(0))

const processor = new Processor(lexicalGrammar, syntacticalGrammar, graphRewritingSystem, nodeEvaluator)

printExpressionHeader(expression)

const AST = processor.parse(expression, { mode: `expression` }, { debug: true })
const { originalContent, content, evaluation, isReady } = processor.resolve(AST, environment, symbolTable, {
  debug: true,
  environmentUpdateCallback: (environment, symbolTable) => {
    const missingSymbols = symbolTable.getMissingSymbols(environment)

    for (const symbol of missingSymbols) {
      let value: Nullable<RuntimeValue<any>> = null

      debugger
      // TODO: Search somewhere for correspondent value

      if (value !== null) environment.assignValue(symbol.name, value)
    }
  },
})
