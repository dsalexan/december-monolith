import assert from "assert"
import { isNil, isNumber, isString, range, sum } from "lodash"
import { Arguments, MaybeUndefined } from "tsdef"

import { Node, Gardener, NodeFactory, SubTree, Grammar, Environment, ObjectSource, Processor, ProcessedData } from "./tree"
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
  processing?: Arguments<Processor[`preProcess`]>[2]
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
    this.rollingDice.object[`d6`] = {
      type: `function`,
      value: (quantity: Quantity, node: Node) => {
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
    }
  }

  public static getEnvironment(options: DiceRollOptions = {}) {
    return this.getInstance().getEnvironment(options)
  }

  public getEnvironment(options: DiceRollOptions = {}) {
    const environment = options.environment ? options.environment.clone() : new Environment()
    if (!options.dontRoll) environment.addSource(this.rollingDice)

    return environment
  }

  public static roll(expression: string, options: DiceRollOptions): ProcessedData
  public static roll(tree: SubTree, options: DiceRollOptions): ProcessedData
  public static roll(expressionOrTree: string | SubTree, options: DiceRollOptions): ProcessedData {
    return this.getInstance().roll(expressionOrTree as any, options)
  }

  public roll(expression: string, options: DiceRollOptions): ProcessedData
  public roll(tree: SubTree, options: DiceRollOptions): ProcessedData
  public roll(expressionOrTree: string | SubTree, options: DiceRollOptions = {}): ProcessedData {
    let expression: string,
      AST: MaybeUndefined<SubTree> = undefined

    // 1. Parse arguments
    if (isString(expressionOrTree)) expression = expressionOrTree
    else {
      AST = expressionOrTree
      expression = AST.expression()
    }

    // 2. Process expresion
    const environment = this.getEnvironment(options)
    const data = this.processor.preProcess(expression, environment, {
      scope: `math-enabled`,
      ...options.processing,
      AST,
    })

    return data
  }
}
