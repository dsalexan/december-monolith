import type Node from ".."
import { NodeParserOptions, NodeParserSetup, defaultOptions } from "./options"
import NodeParserReorganizer from "./reorganizer"
import NodeParserResolver from "./resolver"

export default class NodeParser {
  node: Node

  resolver: NodeParserResolver
  reorganizer: NodeParserReorganizer

  // options are always defined at parse time
  options!: Partial<NodeParserOptions>
  setup!: NodeParserSetup

  constructor(node: Node) {
    this.node = node

    this.resolver = new NodeParserResolver(this)
    this.reorganizer = new NodeParserReorganizer(this)
  }

  _defaultOptions(options: Partial<NodeParserOptions> = {}) {
    this.options = options
    this.setup = defaultOptions(this, options)
  }

  parse(options: Partial<NodeParserOptions> = {}) {
    this._defaultOptions(options)

    this.resolver.resolve()

    // after resolving each character in substring, reorganize
    // this.reorganizer.reorganize()

    // this.resolver.simplify()

    // this.resolver.normalize()

    // this.resolver.specialize()
  }

  reorganize(options: Partial<NodeParserOptions> = {}) {
    this._defaultOptions(options)
    this.reorganizer.reorganize()
  }
}
