import { cloneDeep, indexOf } from "lodash"
import SyntaxNode from "../node/syntaxNode"
import SyntaxManager, { DEFAULT_SYNTAXES, SyntaxName } from "../syntax/manager"
import Tree, { TreeOptions } from "../tree"
import Reorganizer from "./reorganizer"
import Resolver from "./resolver"
import NodePrinter from "../printer"

export type TreeParsingStage = `resolve` | `reorganize`

export default class TreeParser {
  source: string
  syntaxManager: SyntaxManager

  options: Partial<TreeOptions>
  resolver: Resolver
  reorganizer: Reorganizer

  constructor(syntaxManager?: SyntaxManager) {
    this.syntaxManager = syntaxManager ?? new SyntaxManager(DEFAULT_SYNTAXES)

    this.resolver = new Resolver(this)
    this.reorganizer = new Reorganizer(this)
  }

  clone(syntaxManager: SyntaxManager) {
    const parser = new TreeParser(syntaxManager)

    return parser
  }

  parse(source: string, options: Partial<TreeOptions> = {}): Tree {
    this.options = options

    // wrap with imaginary enclosure
    if (source === undefined) debugger
    const _source = options.imaginaryWrap ?? true ? `⟨${source.trim()}⟩` : source.trim()

    this.source = _source
    const tree = new Tree(this.syntaxManager, options)

    // TODO: Parse tree from string source
    tree.root = new SyntaxNode(-1, `root`)
    tree.root.tree = tree
    tree.root.value = _source

    this.parseNode(tree.root, _source)

    tree.normalize()

    return tree
  }

  parseNode(node: SyntaxNode, text: string): boolean {
    this.resolver.resolve(node, text)
    this.reorganizer.reorganize(node)

    return true
  }

  /** Re-parses a node, creating a variant TreeParser with a different syntaxManager to do the work */
  _reparse(node: SyntaxNode, text: string, syntaxes: SyntaxName[] = []) {
    const manager = this.syntaxManager.clone(syntaxes)
    const parser = this.clone(manager)

    // add manager as "child manager", to be able to access its syntaxes for repr(...) purposes
    this.syntaxManager.addChild(manager)

    // enclose in imaginary (TODO: This is annoying, but fixing is worse)
    const newTree = parser.parse(text, { ...cloneDeep(this.options), imaginaryWrap: true })

    //  graft new tree in-place of expression node
    if (!node.parent) debugger
    // get index of node in parent's children
    const index = [...node.parent!.__children.entries()].map(([i, n]) => [i, n]).find(([i, n]) => n === node)?.[0] as number
    if (index === undefined) debugger

    // discard root [0] and imaginary [0][0]
    const relevantNode = newTree.root.children[0].children[0]
    node.parent!.__children[index] = relevantNode
    relevantNode.parent = node.parent!
    relevantNode.tree = node.tree

    return relevantNode
  }
}
