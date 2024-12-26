import { d6, DiceRoller } from "@december/system/dice/dice"
import { Environment, print } from "@december/system/tree"

import logger, { paint } from "./logger"

const thr = d6(2, 5)

console.log(`\n`)
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
logger.add(paint.grey(`MANUAL TREE`)).info()
logger.add(paint.grey.dim(thr.expression())).info()
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

print(thr.root, { expression: thr.expression() })

// TODO: Implement some way to choose specific rolls values in environment (instead of rolling a random number)
const result = DiceRoller.roll(thr, {
  dontRoll: true,
})

result.symbolTable.print()

console.log(`\n`)
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
logger.add(paint.grey.dim.italic(`VALUE  `))
if (result.isReady) logger.add(paint.white.bold(result.tree.value(true))).info()
else logger.add(paint.italic.grey(result.tree.expression(true))).info()
logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
