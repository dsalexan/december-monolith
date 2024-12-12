import { Node } from "../node"

import logger, { Block, paint } from "../../logger"

export function print(node: Node) {
  const blocks: Block[] = []

  blocks.push(...node.toBlocks())

  logger.add(...blocks).info()
  debugger
}
