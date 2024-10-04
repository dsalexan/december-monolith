/**
 *
 *
 *
 *
 */

import { range } from "lodash"

import logger, { paint } from "./logger"

import { UnitManager, BASE_UNITS, DICE } from "./unit"

import { StringProvider } from "./string"
import Grammar from "./type/grammar"
import Lexer from "./phases/lexer"
import Parser from "./phases/parser"
import Semantic, { RULESET_SEMANTIC } from "./phases/semantic"
import Simplify, { RULESETS_SIMPLIFY } from "./phases/simplify"
import Reducer from "./phases/reducer"
import Resolver from "./phases/resolver"
import Processor from "./processor"

import { LITERALS, NUMBER, STRING } from "./type/declarations/literal"
import { OPERATORS, DEFAULT_OPERATORS, ALGEBRAIC_OPERATORS } from "./type/declarations/operator"
import { DEFAULT_SEPARATORS, SEPARATORS } from "./type/declarations/separator"
import { ENCLOSURES } from "./type/declarations/enclosure"
import { WHITESPACES } from "./type/declarations/whitespace"
import { KEYWORDS } from "./type/declarations/keyword"

import { defaultProcessingOptions } from "./options"
import Environment from "./environment"
import { NodeFactory, print, SubTree } from "./node"
import { Gardener } from "./gardener"

// =======================================================

const gardener = Gardener.make()
const plus = gardener.add(NodeFactory.OPERATOR(`addition`))
plus.insert(NodeFactory.PRIMITIVE(1))

const plus2 = plus.add(NodeFactory.OPERATOR(`addition`))
plus2.insert(NodeFactory.PRIMITIVE(2))

// 2. Secondary tree
const minus = Gardener.add(NodeFactory.OPERATOR(`subtraction`))
minus.add(NodeFactory.PRIMITIVE(`x`))
minus.add(NodeFactory.PRIMITIVE(3))

plus2.add(minus.node)

const MT = gardener.get()
const expression = MT.expression()

// =======================================================

const unitManager = new UnitManager()
unitManager.add(...BASE_UNITS)
unitManager.add(...DICE)

const processor = new Processor()
const grammar = processor.makeGrammar(unitManager)
processor.initialize(grammar)

const environment = new Environment()
environment.addObjectSource(`test`, {
  //   literal:string,
  x: 100, // s3.a,
})

//

console.log(`\n`)
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
logger.add(paint.grey(`MANUAL TREE`)).info()
logger.add(paint.grey.dim(expression)).info()
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

print(MT.root, { expression })

//

const data = processor.preProcess(expression, environment, {
  AST: MT,
  debug: true,
  // general
  scope: { root: `math` },
  //
  simplify: {
    rulesets: RULESETS_SIMPLIFY,
  },
  reducer: {
    ignoreTypes: [`conditional`],
  },
})

console.log(`\n`)
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
logger.add(paint.grey(`VALUE`)).add(`  `)
if (data.isReady) logger.add(paint.white.bold(data.tree.value(true))).info()
else logger.add(paint.red.dim.italic(`(not ready)`)).info()
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
