import assert from "assert"
import Node, { NODE_BALANCING } from "../node"
import { isOperand } from "../type/base"
import { isWrapper, LIST } from "../type/declarations/separator"
import { isString, last, sortedIndex, sortedIndexBy } from "lodash"

import { Point, Range } from "@december/utils"
import { Grid } from "@december/logger"
import churchill, { Block, paint, Paint } from "../logger"
import { PartialDeep } from "type-fest"

import TreePrinter, { PrintOptions } from "./printer"
import { BY_TYPE } from "../type/styles"
import { NIL } from "../type/declarations/literal"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export default class Tree {
  public expression: string
  public root: Node

  constructor(expression: string, root?: Node) {
    this.expression = expression
    this.root = root ?? Node.Root(Range.fromLength(0, expression.length).addEntry(new Point(0)).addEntry(new Point(expression.length)))
  }

  get height() {
    return this.root.height
  }

  /** Enlist the range of children into a new node (by default, a list) */
  enlistChildren(parent: Node, start: number, end: number, list?: Node) {
    // only if there is more than one list child
    const onlyChild = end - start === 0
    const firstChildIsList = parent.children[start]?.type?.name === `list`

    if (onlyChild && firstChildIsList) return parent.children[start]

    const children: Node[] = []
    // remove from parent as-is
    for (let i = end; i >= start; i--) children.unshift(parent._removeChildAt(i))

    // create new list if necessry
    if (!list) {
      const imaginary = children.length > 0 ? children[0].range.column(`first`) : parent.range.column(`last`) // return firstmost imaginary of child OR last imaginary of parent
      const fallbackRange = Range.fromPoint(parent.type.name === `root` ? 0 : imaginary) // if root, always get firstmost imaginary column
      list = new Node(LIST, fallbackRange)
    }

    this.addTo(parent, list, start) // add list to parent

    // transfer children
    for (const child of children) this.addTo(list, child)

    return list
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
        else {
          const fallbackRange = Range.fromPoint(firstChild.range.column(`first`))
          target = this.addAsParent(new Node(LIST, fallbackRange), firstChild)
        }
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
        else {
          const fallbackRange = Range.fromPoint(lastChild.range.column(`first`))
          target = this.addAsParent(new Node(LIST, fallbackRange), lastChild)
        }
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

  /** Replaces a target node with another node */
  replaceWith(target: Node, node: Node) {
    assert(target.parent, `Target has no parent`)

    const parent = target.parent!
    const index = target.index

    // remove target from parent
    parent._removeChildAt(index)

    // add node to parent at that index
    this.addTo(parent, node, index)

    return node
  }

  /** Inserts node in sub-tree starting at target */
  insert(target: Node, node: Node) {
    const __DEBUG = false // COMMENT
    global.__DEBUG_LABEL = `${node.lexeme}->${target.name}` // COMMENT

    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      _logger
        .add(paint.grey(`INSERT `)) //
        .add(paint.grey(`${node.range} `))
        .add(paint.grey(`"`))
        .add(BY_TYPE(node.type).bold(node.lexeme))
        .add(paint.grey(`" to `))
        .add(BY_TYPE(target.type)(target.name))
        .info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      console.log(`\n`)
    }

    // if (global.__DEBUG_LABEL === `]->L5.b`) debugger

    assert(node.type.syntactical, `Type "${node.type.name}" has no syntactical rules`)

    let newTarget: Node | null

    if (isOperand(node.type.id)) {
      // append it to current node as a child, priority is kind of irrelevant
      //    but operands always have the HIGHEST priorities among all types (whitespace is ∞, literal is like 10^6)
      this.addTo(target, node)

      // target continues to be the same
      newTarget = target
    } else if (node.type.id === `operator`) {
      // TODO: Upon inserting an binary operator, all nodes before should be enlisted as the left-side parameter

      if (node.syntactical!.priority > target.syntactical!.priority) {
        // node AS PRIORITARY OR MORE than current
        //    insert node between current and its last child
        //    i.e. last child becomes child of new node, new node becomes last child of current

        // ERROR: untested
        if (node.syntactical!.narity !== 2) debugger

        // enlist children
        if (target.children.length > 0) this.enlistChildren(target, 0, target.children.length - 1)
        else {
          //  there are no children to enlist
          //  create and add a nil token

          const nil = new Node(NIL, Range.fromPoint(target.range.column(`first`)))
          this.addTo(target, nil)
        }

        // add node in lastChild's place (as it's parent)
        const lastChild = target.children[target.children.length - 1]
        this.addAsParent(node, lastChild)

        // since we inserted it between current and its last child, return current as new target
      } else {
        // node IS LESS PRIORITARY than current
        //    we need to insert it higher in the tree

        assert(target.parent, `Node has no parent`)

        // climb until we find a parent with lower or equal priority to the new node to add it there
        this.insert(target.parent!, node)

        // since we inserted it higher in the tree, return new node as new target
      }

      newTarget = node
    } else if (node.type.id === `separator` && isWrapper(node.type)) {
      let variant = node.tokenAttributes!.variant

      // if variant is opener-and-closer, we need to determine if it's an opener or closer based on ancestry
      if (variant === `opener-and-closer`) {
        const openerAncestor = target.findAncestor(ancestor => ancestor.type.name === node.type.name && ancestor.tokenAttributes!.variant === `opener-and-closer` && ancestor.balancing === NODE_BALANCING.UNBALANCED)

        variant = openerAncestor ? `closer` : `opener`
      }

      if (variant === `opener`) {
        this.addTo(target, node)

        newTarget = node
      } else if (variant === `closer`) {
        assert(target.parent, `Node has no parent`)

        // find first opener wrapper context in ancestry
        const openerAncestor = target.findAncestor(
          ancestor => ancestor.type.name === node.type.name && (ancestor.tokenAttributes!.variant === `opener` || ancestor.tokenAttributes!.variant === `opener-and-closer`) && ancestor.balancing === NODE_BALANCING.UNBALANCED,
        )

        // ancestor closes separator
        if (openerAncestor) {
          // node is just a closer, it doesnt need to be added to the tree

          // just add it's tokens to ancestor
          // @ts-ignore
          openerAncestor._tokens.push(...node._tokens)

          // return ancestor (since closer node is never added to the tree)
          newTarget = openerAncestor.parent
        }
        // target doesnt close
        else {
          // ERROR: Untested (node is unbalanced closer, so should be considered a literal?)
          debugger

          // climb up the tree until a unbalanced opener node of the same type is found

          // return parent of correct target (since closer node is never added to the tree)
          newTarget = this.insert(target.parent!, node)
        }
      } else throw new Error(`Unimplemented variant "${variant}" for separator`)
    } else if (node.type.id === `separator`) {
      // if (global.__DEBUG_LABEL === `,->+3.b`) debugger

      // go up in ancestry until we find the start of a higher priority context (wrappers force context separation)
      const separator = target.findAncestor(ancestor => {
        if (ancestor.type.name === `list`) return false

        // 1. is a higher priority separator
        if (ancestor.type.id === `separator` && ancestor.type.name === node.type.name) return true

        // 2. is a wrapper separator (they all forcibly close contexts)
        //      break search, dont go further up
        if (isWrapper(ancestor.type) && ancestor.balancing === NODE_BALANCING.UNBALANCED) return null

        return false
      })

      // check if we are in a "separator context" (i.e. target is a list, child of a separator)
      // const grandchildOfSeparator = target.parent?.type?.name === `list` && target.parent?.parent?.type?.name === node.type.name
      // const listChildOfSeparator = target.type.name === `list` && target.parent?.type?.name === node.type.name

      // const alreadyInAnotherSeparatorContext = target.type.id === `separator` && target.type.name !== `list` && !isWrapper(target.type)
      // const alreadyInAnotherWrapperContext = target.type.id === `separator` && isWrapper(target.type) && target.balancing === NODE_BALANCING.UNBALANCED

      // const separatorContext = !(alreadyInAnotherSeparatorContext || alreadyInAnotherWrapperContext) && (grandchildOfSeparator || listChildOfSeparator)

      if (!separator) {
        // so, prepare and enter separator context

        const beforeList = this.enlistChildren(target, 0, target.children.length - 1) // enlist all children of target
        beforeList._range = Range.fromPoint(node.tokens[0].interval.start) // update fallback range of list to start at the first token of the new separator

        this.addAsParent(node, target.children[0]) // add node as target of new list (which would be last - or first - child)

        // ERROR: Untested (points can only be up until N+1)
        if (node.range.column(`last`) + 1 > this.expression.length) debugger

        const fallbackRange = Range.fromPoint(last(node.tokens)!.interval.end + 1)
        const list = new Node(LIST, fallbackRange)
        this.addTo(node, list) // create new empty list and add it to node

        // empty list is the new target
        newTarget = list
      } else {
        // current target is a offspring of separator (be that a child-list of grandchild )

        // so "close that list", creating a new one and adding it to the parent separator

        assert(separator?.type?.name === node.type.name, `Separator mismatch`)

        const fallbackRange = Range.fromPoint(node.range.column(`last`) + 1)
        const list = new Node(LIST, fallbackRange)
        this.addTo(separator, list) // add new list to parent of target (which is a separator)

        // update target's parent (a separator) with new token

        // ERROR: Untested
        if (node.tokens.length !== 1) debugger

        separator.addToken(node.tokens[0])

        newTarget = list
      }
    } else throw new Error(`Unimplemented node type "${node.type.name}"`)

    assert(newTarget, `New target node not set`)

    // if (global.__DEBUG_LABEL === `]->L5.b`) debugger

    if (__DEBUG) {
      // if (global.__DEBUG_LABEL === `,->root`) debugger

      this.print(this.root, {
        sequence: {
          minimumSizeForBracket: 0,
          minimumSizeForPipe: 1,
          padding: {
            character: `‾`,
          },
        },
        style: {
          ignoreSpacing: false,
          alternateColors: false,
          underlineFn(node) {
            return node.id === newTarget?.id
          },
        },
      })
      console.log(`\n`)
    }

    // if (global.__DEBUG_LABEL === `]->L5.b`) debugger
    // debugger

    return newTarget
  }

  /** Returns a list of nodes (in-order) per level of the tree */
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

  /** Returns a list of nodes (in-order) at a level of the tree */
  _nodesByLevel(level: number, node?: Node): Node[] {
    if (node === undefined) node = this.root

    if (node.level === level) return [node]
    else return node.children.flatMap(child => this._nodesByLevel(level, child))
  }

  print(from: Node, options: PrintOptions = {}) {
    TreePrinter.print(this, from, options)
  }

  clone() {
    const tree = new Tree(this.expression, this.root.clone())

    const queue = [this.root]

    // replicate
    while (queue.length) {
      const ATParent = queue.shift()!

      const parent = tree.root.find(node => node.id === ATParent.id)!

      assert(parent, `Parent node not found`)

      // insert node at ST
      for (const ATNode of ATParent.children) {
        const node = ATNode.clone()
        node.setAttributes({
          ...(node.attributes ?? {}),
          originalNodes: [ATNode],
        })

        parent._addChild(node)

        queue.push(ATNode) // enqueue child
      }
    }

    return tree
  }

  /** Traverse tree by level */
  traverse(predicate: (node: Node) => void) {
    predicate(this.root)

    const queue: Node[] = [this.root]

    while (queue.length) {
      const parent = queue.shift()!

      for (const node of parent.children) {
        predicate(node)

        queue.push(node)
      }
    }
  }
}
