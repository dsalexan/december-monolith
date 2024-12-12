import { UnitManager, BASE_UNITS, DICE } from "./unit"

import { DEFAULT_GRAMMAR, Lexer, LexicalGrammar, printExpressionHeader } from ".."

let expression = `10 + 2 * 3`
expression = `(10 + b) * 3x + [2d6 * d6] / "ST:DX::level"`
expression = `@if(10 + b then "else" else [2d6 * d6 + then] / "ST:DX::level")`

expression = expression.replaceAll(/(\r\n|\n|\r) */gm, ``)

const lexicalGrammar = new LexicalGrammar()
lexicalGrammar.add(...DEFAULT_GRAMMAR)

const lexer = new Lexer()

printExpressionHeader(expression)

lexer.process(lexicalGrammar, expression, {})
lexer.print()
