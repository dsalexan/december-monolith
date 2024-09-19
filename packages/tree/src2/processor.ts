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
import { defaultProcessingOptions, InputProcessingOptions, PhaseProcessingOptions, ProcessingOptions } from "./options"
import Environment from "./environment"
import SymbolTable from "./environment/symbolTable"
import { range } from "lodash"
import logger, { paint } from "./logger"
import { SubTree } from "./node"
import assert from "assert"

export interface ProcessedData {
  isReady: boolean
  tree: SubTree
  symbolTable: SymbolTable
}

export default class Processor {
  protected options: ProcessingOptions
  public lexer: Lexer
  public parser: Parser
  public semantic: Semantic
  public simplify: Simplify
  public reducer: Reducer
  public resolver: Resolver
  // RESULT
  public preProcessed: ProcessedData
  public processed: ProcessedData

  constructor() {}

  makeGrammar() {
    const grammar = new Grammar()

    grammar.add(...WHITESPACES)
    grammar.add(...LITERALS)
    // grammar.add(...SEPARATORS)
    grammar.add(...DEFAULT_SEPARATORS)
    grammar.add(...ENCLOSURES)
    grammar.add(...OPERATORS)
    grammar.add(...KEYWORDS)

    return grammar
  }

  initialize(grammar: Grammar) {
    this.lexer = new Lexer(grammar)
    this.parser = new Parser(grammar)
    this.semantic = new Semantic(grammar)
    this.simplify = new Simplify(grammar)
    this.reducer = new Reducer(grammar)
    this.resolver = new Resolver(this.simplify, this.reducer)
  }

  /** Pre-Process expression into a Tree */
  preProcess(expression: string, environment: Environment, _options: InputProcessingOptions & Partial<PhaseProcessingOptions>) {
    this.options = defaultProcessingOptions({
      ..._options,
      //
      resolver: {
        ...(_options.resolver ?? {}),
        SimplifyNRS,
      },
    })

    const DEBUG = this.options.debug // COMMENT
    if (DEBUG) this.printExpression(expression) // COMMENT

    this.lexer.process(expression)
    if (DEBUG) this.lexer.print() // COMMENT

    this.parser.process(expression, this.lexer.tokens, this.options.parser)
    if (DEBUG)
      this.parser.print({
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

    this.semantic.process(this.parser.AST, SemanticNRS, this.options.semantic)
    if (DEBUG) this.semantic.print({ expression }) // COMMENT

    // try to solve semantic tree
    this.preProcessed = this._solveTree(this.semantic.ST, environment)

    return this.preProcessed
  }

  /** Finish processing pre-processed Tree */
  process(environment: Environment) {
    assert(this.preProcessed, `Pre-processed data is not available`)

    const { tree } = this.preProcessed

    this.processed = this._solveTree(tree, environment)

    return this.processed
  }

  /** Solve a tree (simplify+reduce OR resolve) */
  _solveTree(tree: SubTree, environment: Environment): ProcessedData {
    const DEBUG = this.options.debug // COMMENT

    // 1. Solve tree
    this.simplify.process(tree, environment, SimplifyNRS, this.options.simplify)
    if (DEBUG) this.simplify.print({ expression: this.simplify.SST.expression() }) // COMMENT
    if (DEBUG) console.log(` `) // COMMENT

    this.reducer.process(this.simplify.SST, environment, this.options.reducer)
    if (DEBUG) this.reducer.print({ expression: this.reducer.RT.expression() }) // COMMENT

    // this.resolver.process(tree, environment, this.options.resolver)
    // if (DEBUG) this.resolver.print({ expression: this.resolver.result.expression() }) // COMMENT

    // processed tree
    const PT = this.reducer.RT
    const symbolTable = SymbolTable.from(PT, this.options.scope)
    const nonNumericIdentifiers = symbolTable.filter(({ node }) => node.type.name !== `number`)

    const isReady = PT.height <= 2 && nonNumericIdentifiers.length === 0

    return {
      isReady,
      tree: PT,
      symbolTable,
    }
  }

  printExpression(expression: string) {
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
  }
}
