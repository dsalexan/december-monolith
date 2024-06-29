import { cloneDeep, range } from "lodash"
import type NodePrinter from ".."
import Node from "../.."

import churchill, { paint } from "../../../logger"
export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface NodeParserOptions {
  logger: typeof _logger
  //
  syntax: string[]
}

export interface NodeParserSetup {
  logger: typeof _logger
  //
}

export function defaultOptions(printer: NodePrinter, options: Partial<NodeParserOptions>) {
  const logger = options.logger ?? _logger

  return {
    logger,
  } as NodeParserSetup
}
