import { range } from "lodash"
import type NodePrinter from "."
import type Node from ".."
import { paint } from "../../logger"
import NodeBasePrinter from "./base"
import { NodePrinterCell, createCell, NodePrinterLine } from "./cell"

/**
 * Prints only the context of the target node (not necessarely the printer's node)
 */
export class NodeContextPrinter extends NodeBasePrinter {
  _print(target: Node) {
    const { PADDING, CHARACTERS, PRINT } = this.setup

    const context = target.context.toString()

    const cell = createCell(context, PRINT.RANGE, { alignment: `center` })

    this.grid.push(
      NodePrinterLine.make([cell], {
        style: {
          line: [target.backgroundColor.bold],
        },
      }),
    )

    // // a padded strip spanning the whole possible line
    // const paddedText = this._substring(this.node.start, this.node.end! + 1, () => paint.identity(CHARACTERS.WHITESPACE))
    //   .map(block => block._data)
    //   .join(``)
    //   .split(``)

    // const padding = paddedText.length - context.length
    // const offsetStart = Math.ceil(padding / 2)

    // paddedText.splice(offsetStart, context.length, `+`)
    // const [padStart, padEnd] = paddedText.join(``).split(`+`)

    // this.logger.add(` `).debug()
    // this.logger
    //   .add(` `.repeat(PADDING.LEVEL))
    //   .add(target.backgroundColor.bold(`${padStart}${context}${padEnd}`))
    //   .debug()
    // this.logger.add(` `).debug()
  }
}
