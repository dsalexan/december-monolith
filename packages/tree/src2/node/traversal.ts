import assert from "assert"
import type { Node } from "./node/base"
import Token from "../token"
import { isNil, iteratee, reverse } from "lodash"
import { NODE_BALANCING } from "./node/type"

/**
 * ===================================
 *     node.getChildren(maxDepth)
 * ===================================
 *
 * In all traversals we can inform a "maxDepth" to limit the depth of the traversal (by obscuring its children beyond that depth)
 */

/**
 * ===================================
 *              iteratee
 * ===================================
 *
 * An "iteratee" is the function be called on each node during a traversal.
 */

export type GenericTraversal = (node: Node, iteratee: TraversalIteratee) => void
export type TraversalIteratee = (node: Node, token: Token | null, ignorable?: boolean) => void

// #region Node Order

/** Bottom Up */
export function postOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const children = node.getChildren(maxDepth)

  for (const child of children) postOrder(child, iteratee, maxDepth)
  iteratee(node, null)
}

/** Up Bottom */
export function preOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  iteratee(node, null)

  const children = node.getChildren(maxDepth)

  for (const child of children) preOrder(child, iteratee, maxDepth)
}

export function inOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity, behaviour?: InOrderBehaviour) {
  /**
   * By convention, a in-order traversal of a n-ary tree is:
   *  - traverse all children BUT the last
   *  - visit node
   *  - traverse last child
   *
   * Let's call that "Default In-Order Behaviour"
   *
   * Each type of node can override this behaviour by implementing a custom in-order traversal.
   */

  // If we reached the max depth, we don't need to traverse the children (there will be none)
  if (node.level >= maxDepth) return iteratee(node, null)

  behaviour ??= node.type.inOrderBehaviour || defaultInOrderBehaviour

  // if (global.__DEBUG_LABEL === `-->×1.a` && node.name === `×1.a`) debugger

  behaviour(node, iteratee, maxDepth)
}

// #region InOrder Behaviours

export type InOrderBehaviour = (node: Node, iteratee: TraversalIteratee, maxDepth: number) => void

export function defaultInOrderBehaviour(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const children = node.getChildren(maxDepth)

  for (const child of children.slice(0, -1)) inOrder(child, iteratee, maxDepth)

  for (const token of node.tokens) iteratee(node, token)

  if (children.length > 0) inOrder(children[children.length - 1], iteratee, maxDepth)

  // FALLBACK: No tokens or children
  if (node.tokens.length === 0 && children.length === 0) iteratee(node, null)
}

export function unaryInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const { arity } = node.type.syntactical!
  assert(arity === 1, `Unary In-Order Behaviour can only be used with unary nodes`)

  //

  const children = node.getChildren(maxDepth)

  assert(children.length <= 1, `Unary nodes must have at most 1 child`)
  assert(node.tokens.length <= 1, `Unary nodes must have at most 1 token`)

  iteratee(node, node.tokens[0] || null, !node.tokens[0])
  if (children.length > 0) inOrder(children[0], iteratee, maxDepth)
}

export function binaryInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const { arity } = node.type.syntactical!
  assert(arity === 2, `Binary In-Order Behaviour can only be used with binary nodes`)

  //

  const children = node.getChildren(maxDepth)

  assert(children.length <= 2, `Binary nodes must have at most 2 children`)
  assert(node.tokens.length <= 1, `Binary nodes must have at most 1 token`)

  const [left, right] = children

  if (left) inOrder(left, iteratee, maxDepth)
  iteratee(node, node.tokens[0] || null)
  if (right) inOrder(right, iteratee, maxDepth)
}

export function arityInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const { arity } = node.type.syntactical!
  assert(!isNil(arity), `N-arity In-Order Behaviour needs a arity`)

  if (arity === 1) unaryInOrder(node, iteratee, maxDepth)
  else if (arity === 2) binaryInOrder(node, iteratee, maxDepth)
  else if (arity === Infinity) defaultInOrderBehaviour(node, iteratee, maxDepth)
  else throw new Error(`Unimplemented arity: ${arity}`)
}

export function wrapperInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  assert(node.tokens.length >= 1 && node.tokens.length <= 2, `Wrapper nodes must have 1 or 2 tokens (opener and closer or unbalanced)`)

  const children = node.getChildren(maxDepth)

  iteratee(node, node.tokens[0])
  for (const child of children) inOrder(child, iteratee, maxDepth)
  if (node.tokens[1]) iteratee(node, node.tokens[1])
}

export function interleavedInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const children = node.getChildren(maxDepth)

  const targets: (Node | Token)[] = [...children]
  const inPlaceTokens = node.tokens.filter(token => token.attributes.traversalIndex === undefined)
  const lockedTokens = node.tokens.filter(token => token.attributes.traversalIndex !== undefined)

  // 1. Add tokens in-place (taking their index as reference)
  for (const [i, token] of reverse([...inPlaceTokens.entries()])) targets.splice(i + 1, 0, token)

  // 2. Add tokens in their locked index to buffer
  const fromStart: (Token | undefined)[] = []
  const fromEnd: (Token | undefined)[] = []
  for (const token of lockedTokens) {
    if (token.attributes.traversalIndex! >= 0) fromStart[token.attributes.traversalIndex!] = token
    else fromEnd[-token.attributes.traversalIndex!] = token
  }

  // 3. Add from buffer to targets
  for (const [i, token] of reverse([...fromStart.entries()])) if (token) targets.splice(i, 0, token)
  for (const [i, token] of [...fromEnd.entries()]) if (token) targets.splice(targets.length - i + 1, 0, token)

  // 4. Traverse targets
  for (const target of targets) {
    if (target instanceof Token) iteratee(node, target)
    else inOrder(target, iteratee, maxDepth)
  }
}

// #endregion

// #endregion

/** Traverse upwards the tree, minDepth is 0 (root) by default */
export function inContext(node: Node, iteratee: TraversalIteratee, minDepth = 0) {
  // const children = node.getChildren(maxDepth)
  // for (const child of children) postOrder(child, iteratee, maxDepth)
  // iteratee(node, null)

  // check if we should stop
  if (node.level < minDepth) return

  // check context break
  //    only consider nodes in POSITIVE balancing (for now just N/A or BALANCED)
  if (node.type.modules.includes(`context:break`) && node.balancing >= NODE_BALANCING.NON_APPLICABLE) return

  iteratee(node, null) // run iteratee

  // call for parent
  if (node.parent!) inContext(node.parent!, iteratee, minDepth)
}

/** Traverse all nodes in tree by level */
export function byLevel1(root: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const queue: Node[] = [this.root]

  iteratee(root, null)

  while (queue.length) {
    const levelNodes: Node[] = []

    // loop through all nodes in the queue for current level (since we could add new shit to the queue in the loop)
    let size = queue.length
    while (size) {
      const node = queue.shift()!

      if (node.level >= maxDepth) continue

      levelNodes.push(node) // collect to iterate later
      node.children.map(child => queue.push(child)) // queue to check children after iterating

      size--
    }

    levelNodes.map(node => iteratee(node, null))
  }
}

/** Traverse all nodes in tree by level */
export function byLevel(root: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  if (root.level > maxDepth) return

  iteratee(root, null)

  const queue: Node[] = [root]

  while (queue.length) {
    const parent = queue.shift()!
    if (parent.level > maxDepth) continue

    for (const node of parent.children.nodes) {
      iteratee(node, null)

      queue.push(node)
    }
  }
}
