import Processor from "."

import { UnitManager } from "@december/utils/unit"
import { SymbolTable } from "../symbolTable"

import { LexicalGrammar, DEFAULT_GRAMMAR as DEFAULT_LEXICAL_GRAMMAR } from "../lexer"
import { SyntacticalGrammar, DEFAULT_GRAMMAR as DEFAULT_SYNTACTICAL_GRAMMAR } from "../parser"
import { GraphRewritingSystem, DEFAULT_GRAPH_REWRITING_RULESET } from "../rewriter"
import { NodeEvaluator, DEFAULT_EVALUATOR, InterpreterOptions } from "../interpreter"
import { WithOptionalKeys } from "tsdef"

export interface ProcessorOptions {
  unitManager: UnitManager
  symbolTable: SymbolTable
  //
  lexicalGrammar?: LexicalGrammar
  //
  syntacticalGrammar?: SyntacticalGrammar<any>
  //
  graphRewriteSystem?: GraphRewritingSystem
  //
  nodeEvaluator?: NodeEvaluator<any, any>
}

export type ProcessorFactoryFunction<TProcessorOptions extends ProcessorOptions = ProcessorOptions> = (options: TProcessorOptions) => Processor

export function makeDefaultProcessor<TInterpreterOptions extends WithOptionalKeys<InterpreterOptions, `logger`> = WithOptionalKeys<InterpreterOptions, `logger`>>(options: ProcessorOptions): Processor<TInterpreterOptions> {
  const lexicalGrammar = options.lexicalGrammar ?? defaultLexicalGrammar()
  const syntacticalGrammar = options.syntacticalGrammar ?? defaultSyntacticalGrammar(options.unitManager)
  const graphRewriteSystem = options.graphRewriteSystem ?? defaultGraphRewritingSystem()
  const nodeEvaluator = options.nodeEvaluator ?? defaultNodeEvaluator()

  const processor = new Processor<TInterpreterOptions>(lexicalGrammar, syntacticalGrammar, graphRewriteSystem, nodeEvaluator)

  return processor
}

function defaultLexicalGrammar(): LexicalGrammar {
  const lexicalGrammar = new LexicalGrammar()
  lexicalGrammar.add(...DEFAULT_LEXICAL_GRAMMAR)

  return lexicalGrammar
}

function defaultSyntacticalGrammar(unitManager: UnitManager): SyntacticalGrammar<any> {
  const syntacticalGrammar = new SyntacticalGrammar(unitManager)
  syntacticalGrammar.add(...DEFAULT_SYNTACTICAL_GRAMMAR)

  return syntacticalGrammar
}

function defaultGraphRewritingSystem(): GraphRewritingSystem {
  const graphRewritingSystem = new GraphRewritingSystem()
  graphRewritingSystem.add(...DEFAULT_GRAPH_REWRITING_RULESET)

  return graphRewritingSystem
}

function defaultNodeEvaluator(): NodeEvaluator<any, any> {
  const nodeEvaluator = new NodeEvaluator()
  nodeEvaluator.addDictionaries(DEFAULT_EVALUATOR)

  return nodeEvaluator
}
