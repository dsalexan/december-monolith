import { indexOf, isBoolean, isEmpty, isNil, isString, last, orderBy, range, reverse, sortBy, sortedIndex, sum, unzip } from "lodash"

import { NodePrinterOptions, NodePrinterSetup, defaultOptions } from "./options"
import RangeManager, { Range } from "./range"

export { NodePrinterOptions } from "./options"

import type Node from ".."

import churchill, { Block, Paint, paint } from "../../logger"
import { Cell } from "../cell"
export const logger = churchill.child(`node`, undefined, { separator: `` })

export default class NodePrinter {
  node: Node

  // options are always defined at print time
  options!: Partial<NodePrinterOptions>
  setup!: NodePrinterSetup
  range: RangeManager
  // grid: NodePRinterline[] = []
  // columns: NodePrinterColumns

  // context: NodeContextPrinter
  // header: NodeHeaderPrinter
  // text: NodeTextPrinter
  // syntax: NodeSyntaxPrinter

  constructor(node: Node) {
    this.node = node

    this.range = new RangeManager()
    // this.columns = new NodePrinterColumns()

    // this.context = new NodeContextPrinter(this)
    // this.header = new NodeHeaderPrinter(this)
    // this.text = new NodeTextPrinter(this)
    // this.syntax = new NodeSyntaxPrinter(this)
  }

  _defaultOptions(options: Partial<NodePrinterOptions> = {}) {
    this.options = options
    this.setup = defaultOptions(this, options)
  }

  printText() {
    const characters = [...this.node.tree.text]
    const charactersAndIndexes = characters.map((character, index) => [index, character])

    const separatorSize = this.node.tree.text.length.toString().length

    const [indexes, allCharacters] = unzip(charactersAndIndexes) as [number[], string[]]

    logger.add(paint.grey(indexes.map(index => index.toString().padEnd(separatorSize)).join(` `))).debug()
    logger.add(paint.grey(allCharacters.map(character => character.padEnd(separatorSize)).join(` `))).debug()
  }

  print(options: Partial<NodePrinterOptions> = {}) {
    this._defaultOptions(options)

    // this.grid = []
    // this.columns = new NodePrinterColumns()

    this._prepare()
    // this._mount()
    // this._print()

    /**
     * 1. Setup options
     * 2. Prepare node tree as lines
     * 3. Print (align columns if necessary)
     */
  }

  _prepare() {
    const { MAX_LEVEL, PRINT, NODES } = this.setup

    // if (PRINT.CONTEXT) this.context.print(this.node)
    // if (PRINT.HEADER) this.header.print(this.node)

    const template = new Cell(this.node.toString(), this.node.start, this.node.end!)
    console.log(`TEMPLATE`, template.repr())

    for (let i = 0; i < MAX_LEVEL; i++) {
      const level = this.node.level + i
      if (!PRINT.LEVELS.includes(level)) continue

      const nodes = NODES[level]

      console.log(`\n\nLEVEL`, level)
      for (const node of nodes) {
        console.log(`-------------`)
        const cells = node.toCells()
        for (const cell of cells) console.log(cell.repr())
        console.log(`-------------`)
      }

      // if (PRINT.PARENT_NODES) {
      //   // this.printLevelNodes(log, level - 2, { printLevel: true })
      //   // this.printLevelNodes(log, level - 1, { printLevel: true })
      // }

      // if (PRINT.TEXT) {
      //   const _text = this.text.level(level)
      //   _text.print(this.node, { printLevel: true })
      // }

      // if (PRINT.SYNTAX) {
      //   const _syntax = this.syntax.level(level)
      //   _syntax.print(this.node, { printLevel: false })
      // }
    }
  }
}

interface RangedSource {
  range: number[]
  source: Node | string
}
