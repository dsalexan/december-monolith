import Node from ".."
import type { NodePrinterSetup } from "./options"

export interface NodeTextOptions {
  printLevel: boolean
  useWhitespace: boolean
}

export default function parseNodeText(setup: NodePrinterSetup, node: Node, options: Partial<NodeTextOptions> = {}) {
  const { NODES, PADDING, SIZE, CHARACTERS, COLORS, PRINT } = this.setup

  debugger
}
