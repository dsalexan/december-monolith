import Token from "../../token"
import SymbolTable from "../semantic/symbolTable"

/**
 * SYNTATIC ANALYSIS
 * PARSING
 *
 * Tokenized Expression -> Abstract Syntax Tree (AST)
 *
 * - Tokens -> Abstract Tree (AT)
 * - Abstract Tree -> Abstract Syntax Tree (AST)
 * - (Validate nodes)
 * - (Build table of symbols)
 *
 * Usually has the following steps:
 *
 * 1) Tokenization — Convert the input string into a list of tokens. This is covered by the lexer.
 * 2) Parsing — The tokens are analyzed according to the grammar rules of the programming language, and a parse tree or AST is
 *             constructed that represents the hierarchical structure of the program.
 * 3) Error handling — If the input program contains syntax errors, the syntax analyzer detects and reports them to the user,
 *                     along with an indication of where the error occurred.
 * 4) Symbol table creation — The syntax analyzer creates a symbol table, which is a data structure that stores information
 *                            about the identifiers used in the program, such as their type, scope, and location.
 *
 *
 * Node
 *    A data structure composed of a token (lexeme + type), a optional parent and a list of children
 *    Not every node needs a token, though. Tokenless nodes are syntatic suger to facilitate semantic analysis.
 *    It is possible to reduce the AST to the original expression by and printing all node'lexemes in-order (any tokenless node would print an empty string where necessary).
 *
 * Abstract Tree (AT)
 *    A tree of nodes (token, parent, children). Basically a conversion from infix notation (tokenized expression) to a postfix notation (the abstract tree)
 *
 * Abstract Syntax Tree (AST)
 *    The hierarchy of nodes in the AT is analyzed and transformed into a syntax tree (grouping some nodes together, spliting others, transforming some nodes into others, etc...)
 */

/**
 * IDENTIFIER — basically a variable
 * KEYWORD — reserved words of the language (while, for, etc...); shit that can't be a variable, that IS NOT ALLOWED to be a variable
 * SEPARATOR — ponctuation character (| , ;) or delimiters () [] {}
 * OPERATOR — symbols that operate on arguments, kind of like keywords
 * LITERAL — shit that carry a intrinsic value (boolean, strings, numbers, etc...)
 * COMMENT — shit to be discarded
 * WHITESPACE — catch all name for stuff that should be disregarded by the compiler, like most whitespaces (here we don't discard it immediately, since it could be inside a string or something idk)
 *              OR, MAYBE, we just discard whitespaces ALWAYS. there could be a convention that a list of literals are ALWAYS separated by whitespaces
 *              In any case, anything inside this category effectively separates lexical tokens (so it is somewhat useful to find lexemes)
 */

/**
 * At prototyping, the only relevant types are
 *
 * WHITESPACE
 * OPERAND
 *    LITERAL
 *    IDENTIFIER
 * SEPARATOR
 * OPERATOR
 */

import churchill, { Block, paint, Paint } from "../../logger"
import Node from "../../node"
import { isOperand } from "../../type/base"
import Grammar from "../../type/grammar"
import assert from "assert"
import Tree from "../../tree"

import { range, sum } from "lodash"

import { Grid } from "@december/logger"
import { Range } from "@december/utils"
import * as Formats from "../../tree/printer/formats"
import { PrintOptions } from "../../tree/printer"
import { STRING, STRING_COLLECTION } from "../../type/declarations/literal"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface ParserOptions {
  logger?: typeof _logger
}

export default class Parser {
  public options: Partial<ParserOptions>
  //
  public grammar: Grammar
  // tokenized expression -> AT
  private expression: string
  private tokens: Token[]
  public AST: Tree
  public symbolTable: SymbolTable
  //

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** Defaults options for parser */
  _options(options: Partial<ParserOptions>) {
    return options
  }

  /** Process tokenized expression into an Abstract Syntax Tree (AST) */
  process(expression: string, tokens: Token[], options: Partial<ParserOptions> = {}) {
    this._options(options) // default options

    this.expression = expression
    this.tokens = tokens

    this._process()

    return this.AST
  }

  /** Process tokenized expression into an AST */
  private _process() {
    this.AST = this._abstractTree()

    // TODO: Validate AST
    // TODO: Print errors found in AST
  }

  /** Parses the tokenized expression into an abstract tree */
  private _abstractTree(start = 0) {
    const tree = new Tree(this.expression)

    // consume tokens until the end of the token list
    let current: Node = tree.root

    let cursor = start
    while (cursor < this.tokens.length) {
      const token = this.tokens[cursor]
      const node = new Node(token)

      // insert node (starting at current's subtree), and update current after
      current = tree.insert(current, node)

      // advance to next token
      cursor++
    }

    return tree
  }

  // #region DEBUG

  print(options: PrintOptions = {}) {
    const logger = _logger

    // 1. Print expression
    console.log(` `)
    logger.add(paint.gray(range(0, this.expression.length).join(` `))).info()
    logger.add(paint.gray([...this.expression].join(` `))).info()
    console.log(` `)

    // 2. Print Abstract Tree
    console.log(`\n`)
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    _logger
      .add(paint.grey(`ABSTRACT SYNTAX TREE`)) //
      .info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(``)

    this.AST.print(this.AST.root, options)
  }

  // #endregion
}