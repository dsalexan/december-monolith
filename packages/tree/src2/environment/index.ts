import SymbolTable from "./symbolTable"

import churchill, { Block, paint, Paint } from "../logger"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface EnvironmentIdentifier<TValue = any> {
  name: string
  value: TValue
}

export default class Environment {
  has(identifier: string) {
    // TODO: Implement Environment
    return false
  }

  get(identifier: string): EnvironmentIdentifier {
    return {
      name: identifier,
      value: 9,
    }
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
