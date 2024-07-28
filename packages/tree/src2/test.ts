/**
 *
 *
 *
 *
 */

import Lexer from "./lexer"
import Parser from "./parser"
import { LITERALS, NUMBER, STRING } from "./type/declarations/literal"
import { OPERATORS } from "./type/declarations/operator"
import { DEFAULT_SEPARATORS, SEPARATORS } from "./type/declarations/separator"
import { WHITESPACES } from "./type/declarations/whitespace"
import Grammar from "./type/grammar"

let expression = `1 + 2`
// expression = `1 a`
// expression = `(1 + 2) + 3`
// expression = `"1 + 2" + 3`
// expression = `"1 + teste"`
// expression = `"1 + teste" + [3 * 4]`
// expression = `1  <= 5`
// expression = `teste, 1 + 3, A24, -10, [1, 2, 3,], 10 >= 1`
// expression = `2 ** 3`

const grammar = new Grammar()
grammar.add(...WHITESPACES)
grammar.add(...LITERALS)
grammar.add(...SEPARATORS)
grammar.add(...DEFAULT_SEPARATORS)
grammar.add(...OPERATORS)

grammar.print()

const lexer = new Lexer(grammar)
const parser = new Parser(grammar)

lexer.process(expression)
lexer.print()

parser.process(expression, lexer.tokens)
parser.print()
