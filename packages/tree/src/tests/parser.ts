import { UnitManager, BASE_UNITS, DICE } from "./unit"

import {
  DEFAULT_GRAMMAR as DEFAULT_LEXICAL_GRAMMAR,
  Lexer,
  LexicalGrammar,
  printExpressionHeader,
  //
  Parser,
} from ".."
import { SyntacticalGrammar, DEFAULT_GRAMMAR as DEFAULT_SYNTACTICAL_GRAMMAR, DEFAULT_PARSE_EXPRESSION, DEFAULT_PARSE_STATEMENT } from "../parser/grammar"

let expression = `10 + 2 * 3`
expression = `One::level`
expression = `"SK:Teste One::level"`
expression = `@itemhasmod(0, Feet Only)`
// expression = `(10 + b) * 3x + [2d6 * d6] / "ST:DX::level"`
// expression = `@if(10 + b then "else" else [2d6 * d6 + then] / "ST:DX::level")`

expression = expression.replaceAll(/(\r\n|\n|\r) */gm, ``)

const unitManager = new UnitManager()
unitManager.add(...BASE_UNITS)
unitManager.add(...DICE)

const lexicalGrammar = new LexicalGrammar()
lexicalGrammar.add(...DEFAULT_LEXICAL_GRAMMAR)

const syntacticalGrammar = new SyntacticalGrammar(DEFAULT_PARSE_STATEMENT, DEFAULT_PARSE_EXPRESSION)
syntacticalGrammar.add(...DEFAULT_SYNTACTICAL_GRAMMAR)

const lexer = new Lexer()
const parser = new Parser()

printExpressionHeader(expression)

const tokens = lexer.process(lexicalGrammar, expression, {})
lexer.print()

const AST = parser.process(syntacticalGrammar, tokens, { mode: `math-enabled` }, {})
parser.print()