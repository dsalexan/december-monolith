import assert from "assert"
import { isNil, isNumber, isString, range, sum } from "lodash"
import { Arguments, MaybeUndefined } from "tsdef"

import { SymbolTable } from "@december/tree"

import { Node, Gardener, NodeFactory, SubTree, Grammar, Environment, ObjectSource, Processor, ProcessingOutput } from "./tree"
import { D6, DICE, IUnit, Quantity, UnitManager } from "./units"

export function dice(unit: IUnit, base: number, modifier?: number): SubTree {
  const gardener = Gardener.make()

  const hasModifier = !isNil(modifier)

  const node = hasModifier ? gardener.add(NodeFactory.abstract.OPERATOR(`addition`)) : gardener.root

  node.add(NodeFactory.abstract.QUANTITY(unit)).insert(NodeFactory.abstract.PRIMITIVE(base))

  if (hasModifier) node.insert(NodeFactory.abstract.PRIMITIVE(modifier))

  return gardener.get()
}

export function d6(base: number, modifier?: number): SubTree {
  return dice(D6, base, modifier)
}

export interface DiceRollOptions {
  environment?: Environment
  processing?: ProcessingOutput
  dontRoll?: boolean
}

export class DiceRoller {
  private static __instance: DiceRoller
  public static getInstance() {
    if (!this.__instance) this.__instance = new DiceRoller()

    return this.__instance
  }

  unitManager: UnitManager
  processor: Processor
  grammar: Grammar
  //
  rollingDice: ObjectSource

  constructor() {
    this.unitManager = new UnitManager()
    this.unitManager.add(...DICE)

    this.processor = new Processor()
    this.grammar = this.processor.makeGrammar(this.unitManager)
    this.processor.initialize(this.grammar)

    this.rollingDice = new ObjectSource(`dice`)
    this.rollingDice.addKeyEntry(
      {
        value: {
          type: `function`,
          value: (quantity: Quantity, { node }) => {
            assert(node, `Node must be informed`)

            const numberOfDice = quantity.value as number
            assert(isNumber(numberOfDice), `d6: quantity must be a number`)

            const numberOfFaces = 6

            const rolls: number[] = []
            for (let i in range(numberOfDice)) {
              const roll = Math.floor(Math.random() * numberOfFaces) + 1
              console.log(node.name, ` roll #${i} `, roll)
              rolls.push(roll)
            }

            return sum(rolls)
          },
        },
      },
      `d6`,
    )
  }

  public static getEnvironment(options: DiceRollOptions = {}) {
    return this.getInstance().getEnvironment(options)
  }

  public getEnvironment(options: DiceRollOptions = {}): Environment {
    let contextualizedEnvironment = options.environment ? options.environment.clone() : new Environment()

    if (!options.dontRoll) contextualizedEnvironment.addSource(this.rollingDice)

    return contextualizedEnvironment
  }

  public static roll(expression: string, options: DiceRollOptions): ProcessingOutput
  public static roll(tree: SubTree, options: DiceRollOptions): ProcessingOutput
  public static roll(expressionOrTree: string | SubTree, options: DiceRollOptions): ProcessingOutput {
    return this.getInstance().roll(expressionOrTree as any, options)
  }

  public roll(expression: string, options: DiceRollOptions): ProcessingOutput
  public roll(tree: SubTree, options: DiceRollOptions): ProcessingOutput
  public roll(expressionOrTree: string | SubTree, options: DiceRollOptions = {}): ProcessingOutput {
    let expression: string,
      AST: MaybeUndefined<SubTree> = undefined

    // 1. Parse arguments
    if (isString(expressionOrTree)) expression = expressionOrTree
    else {
      AST = expressionOrTree
      expression = AST.expression()
    }

    // 2. Process expresion
    const symbolTable = new SymbolTable()
    const environment = this.getEnvironment(options)

    const buildOutput = this.processor.build(expression, {
      scope: `math-enabled`,
      ...options.processing,
      AST,
    })
    const output = this.processor.resolve(buildOutput, symbolTable, environment)

    return output
  }
}
