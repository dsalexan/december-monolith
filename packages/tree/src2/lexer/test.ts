/**
 *
 *
 *
 *
 */

import Lexer from "."
import LexicalGrammar from "../token/grammar"
import { LITERALS, NUMBER, STRING } from "../token/type/literal"
import { OPERATORS } from "../token/type/operator"
import { DEFAULT_SEPARATORS, SEPARATORS } from "../token/type/separator"
import { WHITESPACES } from "../token/type/whitespace"

let expression = `1 + 2`
expression = `(1 + 2) + 3`
expression = `"1 + 2" + 3`
expression = `"1 + teste"`
expression = `"1 + teste" + [3 * 4]`
expression = `1  <= 5`
expression = `teste, 1 + 3, A24, -10, [1, 2, 3,], 10 >= 1`
expression = `2 ** 3`

const grammar = new LexicalGrammar()
grammar.add(...WHITESPACES)
grammar.add(...LITERALS)
grammar.add(...SEPARATORS)
grammar.add(...DEFAULT_SEPARATORS)
grammar.add(...OPERATORS)

const lexer = new Lexer(grammar)

lexer.process(expression)

lexer.print()
