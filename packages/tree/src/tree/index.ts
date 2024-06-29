import { IMAGINARY } from "./../recipe/enclosure/index"
import { range, flatten, sortBy, isEqual, first, isString, flattenDeep, before, isNil, orderBy, isArray } from "lodash"

import Node, { SerializedNode } from "../node"
import { NodeParserOptions } from "../node/parser/options"
import { RecipeManager } from "../recipe"

import churchill from "../logger"
import { NodePrinterOptions } from "../node/printer2/options"
export const logger = churchill.child(`tree`)

export interface TreeOptions {
  strictChildId: boolean // throw error when a child id already exists in parent node
}

export const DefaultTreeOptions: TreeOptions = {
  strictChildId: false,
}

export default class Tree {
  text: string
  root: Node
  options: TreeOptions

  recipes: RecipeManager

  constructor(text: string, recipes: RecipeManager, options: Partial<TreeOptions> = {}) {
    this.text = text
    this.recipes = recipes
    this.options = { ...DefaultTreeOptions, ...options }

    // initialize root node
    this.root = new Node(`root`, 0, { syntax: `imaginary` })
    this.root.tree = this
    this.root.close(this.text.length)
  }

  deserialize(serialized: SerializedNode) {
    this.root = Node.deserialize(this, serialized)

    return this
  }

  toString() {
    return `<tree#${this.root.context}>`
  }

  get(context: string) {
    return this.root.get(context)
  }

  parse(options: Partial<NodeParserOptions> = {}) {
    const _logger = options.logger ?? logger

    _logger.add(`Parsing Tree`).debug()
    _logger.add(this.text).verbose()

    this.root.parser._defaultOptions(options)
    this.root.parser.parse()
  }

  print(options: Partial<NodePrinterOptions> = {}) {
    logger.add(`<TREE> ${this.text}\n`).debug()

    this.root.printer.printText()

    this.root.print(options)
  }
}
