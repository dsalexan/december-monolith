import { Range } from "@december/utils"

import Node, { NodeFactory, SubTree } from "./node"

export class Gardener {
  _root: Node
  root: NodeWrapper
  //
  private unstable = true
  private nodeFactory: NodeFactory

  constructor(nodeFactory: NodeFactory) {
    this.nodeFactory = nodeFactory
    this._root = this.nodeFactory.ROOT(Range.fromInterval(0, 1))
    this.root = this.wrap(this._root)
  }

  public static make(nodeFactory?: NodeFactory) {
    const gardener = new Gardener(nodeFactory || NodeFactory.abstract)

    return gardener
  }

  public static add(node: Node) {
    const gardener = Gardener.make()
    return gardener.add(node)
  }

  public static insert(node: Node) {
    const gardener = Gardener.make()
    return gardener.insert(node)
  }

  public wrap(node: Node) {
    return new NodeWrapper(node, this)
  }

  public stabilize() {
    if (!this.unstable) return

    this.unstable = false

    this._root.refreshIndexing()
    new SubTree(this._root).expression(true)
  }

  public get() {
    this.stabilize()

    return new SubTree(this._root)
  }

  public add(node: Node) {
    return this.root.add(node)
  }

  public insert(node: Node) {
    this.root.insert(node)

    return this
  }
}

export class NodeWrapper {
  node: Node
  //
  gardener: Gardener

  constructor(node: Node, gardener: Gardener) {
    this.node = node
    //
    this.gardener = gardener
  }

  /** Just inserts node in subtree */
  public insert(node: Node) {
    // this.node.syntactical.addNode(node, undefined, { refreshIndexing: false })
    this.node.children.add(node, null, { refreshIndexing: false })

    return this
  }

  /** Inserts node in subtree AND return wrapper for this new node */
  public add(node: Node) {
    this.insert(node)

    return this.gardener.wrap(node)
  }
}
