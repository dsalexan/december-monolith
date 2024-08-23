import SymbolTable from "./symbolTable"

import churchill, { Block, paint, Paint } from "../logger"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export default class Environment {
  has(identifier: string) {
    // TODO: Implement Environment
    return true
  }

  get(identifier: string) {
    return 999
  }

  print() {
    const logger = _logger

    // 1. Print Scope
    console.log(`\n`)
    logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    logger
      .add(paint.grey(`ENVIRONMENT`)) //
      .info()
    logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

    console.log(this)
  }
}
