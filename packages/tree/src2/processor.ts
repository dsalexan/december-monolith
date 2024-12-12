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
import { defaultProcessingOptions, InputProcessingOptions, PhaseProcessingOptions, ProcessingOptions } from "./options"
import Environment from "./environment"
import { SymbolTable, SymbolValueInvoker } from "./environment/symbolTable"
import { range } from "lodash"
import logger, { paint } from "./logger"
import { print, SubTree } from "./node"
import assert from "assert"
import { UnitManager } from "./unit"
import { Stage } from "./stage"

/**
 * Processor is a centralized packaging class with all phases required for a complete
 * processing of an expression
 */

/**
 * PROCESSING EXPRESSIONS INSIDE A MUTABLE ECOSYSTEM
 *
 * - Expressions should be handled inside mutation functions
 * - Once a processing resolves ready, it should update a FIXED PATH inside the mutable object
 * - Sometimes a expression can depend on external values to resolve fully.
 * - Sometimes the expression will use "default" values for missing identifiers JUST TO resolve the processing, this should
 *      not "permanently" change the expression resulting tree in cache
 *
 * PRE-PROCESS
 * - Parses EXPRESSION into a SEMANTIC TREE (actually expression -> lexer -> parser, AST -> semantic, ST)
 * - A semantic tree is the "base hierarchy" of the expression as a tree.
 * - After processing once we don't need to do it again (since the semantic tree will never change while the expression remains the same)
 * - Maybe "pre-processing" sounds a bit confusing.
 * - Essentially "BUILD TREE"
 *
 * PROCESS
 * - Gets SEMANTIC TREE and simplify/reduces it ("resolves" it).
 * - Simplifying applies some rules to the tree structure, changing it in some ways. This can remove missing symbols.
 * - Reducing changes some identifiers by a specific value indicated in the Environment supplied on call. This can introduce new missing symbols.
 * - This essentially is a tree resolver, so... "SOLVE TREE".
 *
 *
 */

export type ProcessorBuildOptions = InputProcessingOptions & Partial<PhaseProcessingOptions>

export interface ProcessingOutput {
  expression: string
  stage: Stage
  tree: SubTree
}

export default class Processor {
  public options: ProcessingOptions
  //
  public lexer: Lexer
  public parser: Parser
  public semantic: Semantic
  public simplify: Simplify
  public reducer: Reducer
  public resolver: Resolver

  constructor() {}

  public makeGrammar(unitManager: UnitManager) {
    const grammar = new Grammar(unitManager)

    grammar.add(...WHITESPACES)
    grammar.add(...LITERALS)
    // grammar.add(...SEPARATORS)
    grammar.add(...DEFAULT_SEPARATORS)
    grammar.add(...ENCLOSURES)
    grammar.add(...OPERATORS)
    grammar.add(...KEYWORDS)

    return grammar
  }

  public initialize(grammar: Grammar) {
    this.lexer = new Lexer(grammar)
    this.parser = new Parser(grammar)
    this.semantic = new Semantic(grammar)
    //
    this.simplify = new Simplify(grammar)
    this.reducer = new Reducer(grammar)
    this.resolver = new Resolver(this.simplify, this.reducer)
  }

  /**
   * Parses an expression into a Semantic Tree.
   * That resulting tree is immutable for the original expression, there is no need to re-parse it later.
   * It also is not dependent in environment or unresolved identifiers.
   */
  public build(expression: string, options: ProcessorBuildOptions): ProcessingOutput & { symbolTable: SymbolTable } {
    this.options = defaultProcessingOptions({
      ...options,
      //
      simplify: {
        rulesets: RULESETS_SIMPLIFY,
      },
    })

    const DEBUG = this.options.debug // COMMENT
    if (DEBUG) printExpression(expression) // COMMENT

    if (!options.AST) {
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
    }

    const AST = options.AST ?? this.parser.AST
    const semanticTree = this.semantic.process(AST, [RULESET_SEMANTIC], this.options.semantic)
    if (DEBUG) this.semantic.print({ expression }) // COMMENT

    // 2. Build symbol table to track ALL symbols related to expression
    const symbolTable = SymbolTable.from(`semantic`, semanticTree, this.options)

    return {
      expression,
      tree: semanticTree,
      stage: `semantic_analysis`,
      //
      symbolTable,
    }
  }

  /**
   * Tries to resolve a tree based on an environment.
   *
   * Can be any tree, initially would be a semantic post-building
   */
  public resolve(processingOutput: ProcessingOutput, symbolTable: SymbolTable, environment: Environment, includesFallback: boolean = false): ProcessingOutput {
    const DEBUG = this.options.debug // COMMENT
    const { tree } = processingOutput

    // Resolve (simplify + reduce) semantic tree
    const resolvedTree = this.resolver.process(tree, symbolTable, environment, { ...(this.options.resolver ?? {}), includesFallback })
    if (DEBUG) this.resolver.print({ expression: this.resolver.result.expression() }) // COMMENT

    return {
      expression: processingOutput.expression,
      tree: resolvedTree,
      stage: `reduction`,
    }
  }

  /**
   * Checks if a tree "is ready" (i.e. if it is, essentially, a proper unique value and not a tree)
   */
  public isReady(tree: SubTree, symbolTable?: SymbolTable): boolean
  public isReady(output: ProcessingOutput, symbolTable?: SymbolTable): boolean
  public isReady(treeOrOutput: SubTree | ProcessingOutput, symbolTable?: SymbolTable): boolean {
    const tree: SubTree = treeOrOutput instanceof SubTree ? treeOrOutput : treeOrOutput.tree
    symbolTable ??= SymbolTable.from(`temp`, tree, this.options)

    // 2. Check if tree is ready
    const nonNumericSymbols = symbolTable.getNodes().filter(node => {
      const isNil = node.type.name === `nil`
      const isNonNumericLiteral = node.type.isLiteralLike() && ![`number`, `sign`, `boolean`, `quantity`].includes(node.type.name) && !isNil

      return isNonNumericLiteral
    })
    const isReady = tree.height <= 2 && nonNumericSymbols.length === 0

    return isReady
  }

  /** Tries to resolve tree multiple times (until no new symbols can be resolved into the environment) */
  public solveLoop(input: ProcessingOutput, symbolTable: SymbolTable, environment: Environment, getSymbolValue: SymbolValueInvoker, includesFallback: boolean = false): ProcessingOutput {
    let output: ProcessingOutput = input

    const STACK_OVERFLOW_PROTECTION = 10

    let runs = 1
    let newSymbolsWereAddedToEnvironment = false
    do {
      newSymbolsWereAddedToEnvironment = false

      // 1. resolve with current environment
      output = this.resolve(output, symbolTable, environment, includesFallback)
      if (this.isReady(output)) break // stop loop if output is ready

      // 2. get and inject resolved symbols into environment
      const missingSymbolKeys = symbolTable.getMissingSymbolKeys(environment, includesFallback)
      newSymbolsWereAddedToEnvironment = SymbolTable.injectIntoEnvironment(missingSymbolKeys, environment, getSymbolValue)

      // only loop again if new symbols were added to environment
      runs++

      assert(runs <= STACK_OVERFLOW_PROTECTION, `Stack overflow protection triggered`)
    } while (newSymbolsWereAddedToEnvironment)

    return {
      expression: output.tree.expression(),
      tree: output.tree,
      stage: `reduction`,
    }
  }
}

function printExpression(expression: string) {
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
