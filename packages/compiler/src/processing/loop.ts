/**
 * BUILD TREE
 *
 * Parses an expression into a Semantic Tree.
 * That resulting tree is immutable for the original expression, there is no need to re-parse it later.
 * It also is not dependent in environment or unresolved identifiers.
 *
 * Re-processing the expression makes use of the original processor object (that holds each individual phase processor).
 */

import { Processor, Environment, Simbol, ObjectSourceData } from "@december/tree"
import { UnitManager } from "@december/utils/unit"

export interface BuildTreeOptions {
  unitManager: UnitManager
}

export function buildTree(expression: string, { unitManager }: BuildTreeOptions) {
  // 1. Make dedicated processor for expression
  const processor = new Processor()
  const grammar = processor.makeGrammar(unitManager)
  processor.initialize(grammar)

  // 2. Pre-process expression (i.e. expression -> Semantic Tree)
}
