import assert from "assert"
import Node from "./node"
import { isOperand } from "../type/base"
import { LIST } from "../type/declarations/separator"
import { sortedIndex, sortedIndexBy } from "lodash"

export default class SyntaxTree {
  root: Node

  constructor(root: Node) {
    this.root = root
  }

  get height() {
    return this.root.height
  }

  /** Adds node as parent of target (and, thus, adds node as i-child of target's parent — where i is target.index) */
  addAsParent(node: Node, target: Node) {
    assert(target.parent, `Target has no parent`)

    const parent = target.parent!
    const index = target.index

    // narity of parent will be respected, but future syntactical rules may not be

    // TODO: Test this
    if (node.parent) debugger

    parent._removeChildAt(index) // remove target from parent
    this.addTo(parent, node, index) // add node to parent at that index
    this.addTo(node, target) // add target as child of node

    return node
  }

  /** Adds node to parent at index, but respecting syntactical rules (like n-arity) */
  addTo(parent: Node, child: Node, index?: number) {
    assert(parent.type.syntactical, `Type "${parent.type.name}" has no syntactical rules`)

    const { narity } = parent.type.syntactical!

    assert(narity > 0, `Type "${parent.type.name}" is nullary, it should have no children`)

    if (narity === Infinity) {
      // just add to parent
      parent._addChild(child, index)
    } else if (narity === 1) {
      // unary
      //    parent should only have one child

      let target = parent
      if (parent.children.length === 1) {
        // if parent already have a child, transfer it to a list node and add it to parent in its place

        const firstChild = parent.children[0]

        // (if first child is already a list, just add to it)
        if (firstChild.type.name === `list`) target = firstChild
        // list is the new target to add the new child
        else target = this.addAsParent(new Node(LIST), firstChild)
      } else if (parent.children.length > 1) throw new Error(`Unary thing should not have multiple children`)

      // add child to target
      target._addChild(child)
    } else if (narity === 2) {
      // binary
      //    parent should have two children

      let target = parent
      if (parent.children.length === 2) {
        // if parent already have two children
        //     transform last child into a list node (and add new child to it)

        const lastChild = parent.children[1]

        // (if last child is already a list, just add to it)
        if (lastChild.type.name === `list`) target = lastChild
        // list is the new target to add the new child
        else target = this.addAsParent(new Node(LIST), lastChild)
      } else if (parent.children.length > 1) throw new Error(`Binary thing should not have more than two children`)

      // add child to target
      target._addChild(child)
    } else throw new Error(`Unimplemented n-arity ${narity}`)
  }

  /** Removes a node from parent at index */
  removeFrom(parent: Node, index: number) {
    // TODO: Test this, what happens when we are removing the only child of a list? (Since a list is a syntactical device to group multiple same-level nodes - usually operands)
    if (parent.type.name === `list` && parent.children.length === 1) debugger

    return parent._removeChildAt(index)
  }

  /** Inserts node in sub-tree starting at target */
  insert(target: Node, node: Node) {
    assert(node.type.syntactical, `Type "${node.type.name}" has no syntactical rules`)

    if (isOperand(node.type.id)) {
      // append it to current node as a child, priority is kind of irrelevant
      //    but operands always have the HIGHEST priorities among all types (whitespace is ∞, literal is like 10^6)
      this.addTo(target, node)

      // target continues to be the same
      return target
    } else if (node.type.id === `operator`) {
      if (node.syntactical!.priority >= target.syntactical!.priority) {
        // node AS PRIORITARY OR MORE than current
        //    insert node between current and its last child
        //    i.e. last child becomes child of new node, new node becomes last child of current

        // add node in lastChild's place (as it's parent)
        const lastChild = target.children[target.children.length - 1]
        this.addAsParent(node, lastChild)

        // since we inserted it between current and its last child, return current as new target
        return node
      } else {
        // node IS LESS PRIORITARY than current
        //    we need to insert it higher in the tree

        assert(target.parent, `Node has no parent`)

        // climb until we find a parent with lower or equal priority to the new node to add it there
        this.insert(target.parent!, node)

        debugger
        // since we inserted it higher in the tree, return new node as new target
        return node
      }
    }

    throw new Error(`Unimplemented node type "${node.type.name}"`)
  }

  /** Returns a list of nodes (in index order) per level of the tree */
  nodesByLevel(): Node[][] {
    const nodes: Node[][] = []

    const queue: Node[] = [this.root]

    while (queue.length) {
      const levelNodes: Node[] = []

      let size = queue.length
      while (size) {
        const node = queue.shift()!
        levelNodes.push(node)

        // gather all the children of node dequeued and enqueue them(left/right nodes)
        node.children.forEach(child => queue.push(child))

        size--
      }

      nodes.push(levelNodes)
    }

    return nodes
  }
}
