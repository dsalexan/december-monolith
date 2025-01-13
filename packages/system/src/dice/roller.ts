import { isString } from "lodash"

import { Environment, Node, SymbolTable, SyntacticalContext } from "@december/tree"
import { Simbol } from "@december/tree/symbolTable"
import Processor, { makeDefaultProcessor, ProcessorOptions, ResolutionOutput } from "@december/tree/processor"
import { makeConstantLiteral } from "@december/tree/utils/factories"

import { defaultUnitManager } from "../units"
import { DICE_MODULAR_SYNTACTICAL_GRAMMAR, DiceRollExpression } from "./parser"
import { DICE_RULESET } from "./rewriter"
import { DICE_MODULAR_EVALUATOR_PROVIDER, DiceInterpreterOptions } from "./interpreter"
import { DiceKeep } from "./dice"
import assert from "assert"

/** Make a processor using default modules and dice modules */
export function makeDefaultDiceProcessor(options: ProcessorOptions): Processor<DiceInterpreterOptions> {
  const processor = makeDefaultProcessor<DiceInterpreterOptions>(options)

  processor.syntacticalGrammar.add(...DICE_MODULAR_SYNTACTICAL_GRAMMAR)
  processor.graphRewriteSystem.add(...DICE_RULESET)
  processor.nodeEvaluator.addDictionaries(DICE_MODULAR_EVALUATOR_PROVIDER, true)

  return processor
}

if (!global.__DEFAULT_DICE_PROCESSOR) global.__DEFAULT_DICE_PROCESSOR = makeDefaultDiceProcessor({ unitManager: defaultUnitManager(), symbolTable: new SymbolTable() })
export const DEFAULT_DICE_PROCESSOR: Processor<DiceInterpreterOptions> = global.__DEFAULT_DICE_PROCESSOR

/** Rolls dice through notation */
export function rollDice(AST: Node, processor?: Processor<DiceInterpreterOptions>): ResolutionOutput
export function rollDice(diceNotation: string, processor?: Processor<DiceInterpreterOptions>): ResolutionOutput
export function rollDice(diceNotationOrAST: string | Node, processor?: Processor<DiceInterpreterOptions>): ResolutionOutput {
  /**
   * I imagine it would be something like this:
   *
   * 1. Parse the dice notation into an AST
   * 2. Resolve the AST into an evaluation with "rollDice" option
   * 3. Profit
   */

  processor ??= DEFAULT_DICE_PROCESSOR
  const syntacticalContext: SyntacticalContext = { mode: `expression` }

  const environment = new Environment(`root`)
  const locallyAssignedSymbols: Simbol[`name`][] = []

  let AST: Node
  if (isString(diceNotationOrAST)) {
    const parsedOutput = processor.parse(diceNotationOrAST, environment, processor.symbolTable, locallyAssignedSymbols, { syntacticalContext })
    assert(parsedOutput.AST, `Failed to parse expression.`)
    AST = parsedOutput.AST
  } else AST = diceNotationOrAST

  const resolvedOutput = processor.resolve(AST, environment, processor.symbolTable, locallyAssignedSymbols, { syntacticalContext, rollDice: true })

  const { originalContent, evaluation, content, isReady } = resolvedOutput

  // // If it is ready
  // const value = evaluation?.runtimeValue?.value
  // // If it is not ready
  // const simplifiedNotation = content

  return resolvedOutput
}

export function d6(size: number, keep?: DiceKeep): DiceRollExpression {
  return new DiceRollExpression(makeConstantLiteral(size), 6, keep)
}

// rollDice(d6(2))
// rollDice(`2d6 + 5`)
