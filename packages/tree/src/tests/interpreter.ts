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

import Interpreter, { createNumericValue, DEFAULT_EVALUATE, DEFAULT_RUNTIME_TO_NODE, Environment } from "../interpreter"
import { DICE_MODULAR_SYNTACTICAL_GRAMMAR, evaluateWithDice, runtimeValueToNodeWithDice } from "../interpreter/default/dice"

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
// expression = `@if(10 + b then "else" else [2d6 * d6 + "then"] / "ST:DX::level")`

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
syntacticalGrammar.add(createReTyperEntry(`self`, `Identifier`, EQUALS(`self`)))
syntacticalGrammar.add(createReTyperEntry(`alias`, `Identifier`, REGEX(/^\w{2}::.+$/)))

const environment = new Environment()
// environment.assignVariable(`b`, { type: `number`, value: 2 })
environment.assignVariable(`self`, createNumericValue(15, null as any))
// environment.registerResolutionPattern(`alias`, `<ALIAS>`, REGEX(/^\w{2}::.+$/))
// environment.assignVariable('<ALIAS>', )

const lexer = new Lexer()
const parser = new Parser()
const interpreter = new Interpreter()

printExpressionHeader(expression)

const tokens = lexer.process(lexicalGrammar, expression, {})
lexer.print()

const AST = parser.process(syntacticalGrammar, tokens, { mode: `expression` }, {})
parser.print()

const result = interpreter.process(AST, environment, evaluateWithDice, runtimeValueToNodeWithDice, {})
interpreter.print()
