import assert from "assert"
import { Nullable, WithOptionalKeys } from "tsdef"
import { cloneDeep, isString } from "lodash"

import { numberToLetters } from "@december/utils"

import churchill, { Block, paint, Paint } from "../logger"

import Interpreter, { Environment, InterpreterOptions, NodeEvaluator, RuntimeEvaluation, RuntimeValue } from "../interpreter"
import Lexer, { InjectionData, LexicalGrammar } from "../lexer"
import Parser, { SyntacticalContext, SyntacticalGrammar } from "../parser"
import Rewriter, { GraphRewritingSystem } from "../rewriter"
import { Node, Statement } from "../tree"
import { SymbolTable } from "../symbolTable"
import { Token } from "../token/core"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export { makeDefaultProcessor } from "./default"
export type { ProcessorOptions, ProcessorFactoryFunction } from "./default"

export interface BaseProcessorRunOptions {
  logger?: typeof _logger
  debug?: boolean
  environmentUpdateCallback?: (environment: Environment, symbolTable: SymbolTable) => void
  syntacticalContext: SyntacticalContext
  //
  injection?: string
  resolutionRun?: number
}

export interface ProcessorPruneOptions extends BaseProcessorRunOptions {
  pruningRun: number
}

export default class Processor<TInterpreterOptions extends WithOptionalKeys<InterpreterOptions, `logger`> = WithOptionalKeys<InterpreterOptions, `logger`>> {
  //
  private lexer: Lexer
  public lexicalGrammar: LexicalGrammar
  //
  private parser: Parser
  public syntacticalGrammar: SyntacticalGrammar<any>
  //
  private rewriter: Rewriter
  public graphRewriteSystem: GraphRewritingSystem
  //
  private interpreter: Interpreter<any, TInterpreterOptions>
  public symbolTable: SymbolTable
  public nodeEvaluator: NodeEvaluator<any, any>
  //
  //
  //

  constructor(lexicalGrammar: LexicalGrammar, syntacticalGrammar: SyntacticalGrammar<any>, graphRewriteSystem: GraphRewritingSystem, nodeEvaluator: NodeEvaluator<any, any>) {
    this.lexer = new Lexer()
    this.parser = new Parser()
    this.rewriter = new Rewriter()
    this.interpreter = new Interpreter<any, TInterpreterOptions>()
    //
    this.lexicalGrammar = lexicalGrammar
    this.syntacticalGrammar = syntacticalGrammar
    this.graphRewriteSystem = graphRewriteSystem
    this.nodeEvaluator = nodeEvaluator
  }

  /** Process certain sections of expression and inject resulting stuff into placeholders */
  public inject(tokens: Token[], injections: InjectionData[], environment: Environment, symbolTable: SymbolTable, options: BaseProcessorRunOptions & TInterpreterOptions): boolean {
    if (injections.length === 0) return true

    for (let i = 0; i < injections.length; i++) {
      const injection = injections[i]

      // 1. Parse partial expression
      const { AST } = this.parse(injection.expression, environment, symbolTable, { ...options, injection: `${options.injection ?? `⌀`} > $${injection.index}` })
      if (!AST) continue

      // 2. Determine context by injection function
      let syntacticalContext: SyntacticalContext = cloneDeep(options.syntacticalContext)
      if (injection.name === `solver` || injection.name === `evaluate` || injection.name === `eval`) {
        syntacticalContext = { ...syntacticalContext, mode: `expression` }
      }
      //
      else throw new Error(`Unknown injection function "${injection.name}"`)

      // 3. Resolve partial expression
      const { originalContent, content, evaluation, isReady } = this.resolve(AST, environment, symbolTable, {
        ...options,
        syntacticalContext,
      })
      if (!isReady) continue

      // 4. Replace injection placeholder with evaluated value's token version
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j]
        if (token.kind.name === `injection_placeholder` && token.content === `$${injection.index}`) {
          const newToken = evaluation!.runtimeValue!.toToken()

          injection.result = {
            runtimeValue: evaluation!.runtimeValue!,
            token: newToken,
          }

          break
        }
      }

      assert(injection.result, `Injection placeholder was not computed`)
    }

    const areAllInjectionsResolved = injections.every(injection => injection.result !== undefined)

    return areAllInjectionsResolved
  }

  /** Parses string expression into an Abstract Syntax Tree */
  public parse(expression: string, environment: Environment, symbolTable: SymbolTable, options: BaseProcessorRunOptions & TInterpreterOptions): ParsingOutput {
    const DEBUG = options.debug ?? false // COMMENT
    const logger = options.logger ?? _logger // COMMENT

    const injection = options.injection ?? `⌀`

    const { tokens, injections } = this.lexer.process(`${injection}`, this.lexicalGrammar, expression, {})
    const originalTokens = [...tokens]
    if (DEBUG) this.lexer.print() // COMMENT

    const noPendingInjections = this.inject(tokens, this.lexer.injections, environment, symbolTable, { ...options })

    let AST: Nullable<Node> = null
    if (noPendingInjections) {
      AST = this.parser.process(this.syntacticalGrammar, tokens, injections, { ...options })
      if (DEBUG) this.parser.print() // COMMENT
    }

    return {
      originalExpression: expression,
      tokens,
      injections,
      AST,
    }
  }

  /** Tries to resolve an Abstract Syntax Tree into some value (by "pruning" the tree as much as possible)*/
  public resolve(AST: Node, environment: Environment, symbolTable: SymbolTable, options: BaseProcessorRunOptions & TInterpreterOptions): ResolutionOutput {
    const RESOLUTION_RUN = options.resolutionRun ?? 0
    const STACK_OVERFLOW_PROTECTION = 5

    let i = 0
    let latestTree = AST

    // A. Pruning loop (i.e. prune tree as much as possible)
    let latestPruning: PruningOutput | Nullable<PruningOutput> = null
    while (i < STACK_OVERFLOW_PROTECTION) {
      // 1. Tries to prune tree
      //      (we skip simplification at first run bc GCA has lots of easy math, and easy math is faster then checking rewrite rules)
      const pruning = this.prune(latestTree, environment, symbolTable, { ...options, pruningRun: i })
      assert(pruning !== null || i > 0, `Pruning output should not be null on first run`) // COMMENT
      if (pruning === null) break // content never changed between prunings, no need to run again

      latestPruning = pruning
      latestTree = latestPruning.evaluation.node

      // 2. If it is ready, break
      // if (latestPruning.isReady) {
      //   if (latestPruning.content === `((2d6 - 1) + 0) + 0`) debugger
      // }

      // 3. If nothing really changed from last iteration, break resolution loop
      if (latestPruning.originalContent === latestPruning.content) break

      // 4. If something was pruned, tries again
      i++
      assert(i < STACK_OVERFLOW_PROTECTION, `Stack overflow protection triggered`) // COMMENT
    }

    assert(latestPruning !== null, `Pruning output should not be null`)

    if (options.environmentUpdateCallback) {
      const previosVersion = environment.getVersion()

      // 1. Wait for environment update
      //      (TODO: inside here we would check all missing symbols, from symbolTable, and ATTEMPT to inject them, resolve the variable, into the ENVIRONMENT)
      options.environmentUpdateCallback(environment, symbolTable)

      const currentVersion = environment.getVersion()
      // 2. If environment was updated, try to resolve again
      assert(RESOLUTION_RUN + 1 < STACK_OVERFLOW_PROTECTION, `Stack overflow protection triggered`) // COMMENT
      if (previosVersion !== currentVersion) return this.resolve(latestTree, environment, symbolTable, { ...options, resolutionRun: RESOLUTION_RUN + 1 })
      // }
    }

    // D. If nothing changed (be that the environment or the evaluated tree), end resolution
    return latestPruning!
  }

  /** Reduces tree (by simplifying and then evaluating) */
  protected prune(AST: Node, environment: Environment, symbolTable: SymbolTable, options: ProcessorPruneOptions & TInterpreterOptions): Nullable<PruningOutput> {
    const DEBUG = options.debug ?? false // COMMENT
    const logger = options.logger ?? _logger // COMMENT

    /**
     * FIRST_RUN (pruningRun === 0) means it is the first pruning run
     *
     * Subsequent pruning runs (i.e. not the first) can skip pruning anytime the content doesnt change between steps
     * The first run also ignores the simplification step
     */

    let tree: Node = AST
    const originalContent = AST.getContent()

    // 1. Simplify AST
    if (options.pruningRun > 0) {
      const simplifiedTree = this.rewriter.process(AST, this.graphRewriteSystem, {})
      const simplifiedContent = simplifiedTree.getContent()
      if (simplifiedContent === originalContent) return null // skip pruning, content never changed
      if (DEBUG) this.rewriter.print() // COMMENT

      tree = simplifiedTree
    }

    // 2. Evaluate simplified AST
    //      (we ALWAYS evaluate post-simplification, it is super fast)
    const evaluatedOutput = this.interpreter.process(`${numberToLetters(options.resolutionRun ?? 0).toLowerCase()}I${options.pruningRun}`, tree, environment, symbolTable, this.nodeEvaluator, this.parser, {
      ...options,
    })
    if (DEBUG) this.interpreter.print() // COMMENT
    const evaluatedContent = evaluatedOutput.getContent()
    const isReady = evaluatedOutput.runtimeValue !== null

    return {
      originalContent,
      evaluation: evaluatedOutput,
      content: evaluatedContent,
      isReady,
    }
  }
}

export interface PruningOutput {
  originalContent: string
  evaluation: RuntimeEvaluation<RuntimeValue<any>, Statement>
  content: string
  isReady: boolean
}

export interface ResolutionOutput extends PruningOutput {}

export interface ParsingOutput {
  originalExpression: string
  tokens: Token[]
  injections: InjectionData[]
  AST: Nullable<Node>
}
