import assert from "assert"
import type Node from "./."
import Token from "../token"
import { isNil, reverse } from "lodash"

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

export type TraversalIteratee = (node: Node, token: Token | null, ignorable?: boolean) => void

export function postOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const children = node.getChildren(maxDepth)

  for (const child of children) postOrder(child, iteratee, maxDepth)
  iteratee(node, null)
}

export function preOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  iteratee(node, null)

  const children = node.getChildren(maxDepth)

  for (const child of children) preOrder(child, iteratee, maxDepth)
}

export function inOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
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

  const behaviour = node.type.inOrderBehaviour || defaultInOrderBehaviour

  behaviour(node, iteratee, maxDepth)
}

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
  const { narity } = node.type.syntactical!
  assert(narity === 1, `Unary In-Order Behaviour can only be used with unary nodes`)

  //

  const children = node.getChildren(maxDepth)

  assert(children.length <= 1, `Unary nodes must have at most 1 child`)
  assert(node.tokens.length <= 1, `Unary nodes must have at most 1 token`)

  iteratee(node, node.tokens[0] || null, !node.tokens[0])
  if (children.length > 0) inOrder(children[0], iteratee, maxDepth)
}

export function binaryInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const { narity } = node.type.syntactical!
  assert(narity === 2, `Binary In-Order Behaviour can only be used with binary nodes`)

  //

  const children = node.getChildren(maxDepth)

  assert(children.length <= 2, `Binary nodes must have at most 2 children`)
  assert(node.tokens.length <= 1, `Binary nodes must have at most 1 token`)

  const [left, right] = children

  if (left) inOrder(left, iteratee, maxDepth)
  iteratee(node, node.tokens[0] || null)
  if (right) inOrder(right, iteratee, maxDepth)
}

export function narityInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const { narity } = node.type.syntactical!
  assert(!isNil(narity), `N-arity In-Order Behaviour needs a narity`)

  if (narity === 1) unaryInOrder(node, iteratee, maxDepth)
  else if (narity === 2) binaryInOrder(node, iteratee, maxDepth)
  else if (narity === Infinity) defaultInOrderBehaviour(node, iteratee, maxDepth)
  else throw new Error(`Unimplemented narity: ${narity}`)
}

export function wrapperInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  assert(node.tokens.length === 2, `Wrapper nodes must have 2 tokens (opener and closer)`)

  const children = node.getChildren(maxDepth)

  iteratee(node, node.tokens[0])
  for (const child of children) inOrder(child, iteratee, maxDepth)
  iteratee(node, node.tokens[1])
}

export function interleavedInOrder(node: Node, iteratee: TraversalIteratee, maxDepth = Infinity) {
  const children = node.getChildren(maxDepth)

  const targets: (Node | Token)[] = [...children]
  const inPlaceTokens = node.tokens.filter(token => token.attributes.traversalIndex === undefined)
  const lockedTokens = node.tokens.filter(token => token.attributes.traversalIndex !== undefined)

  // 1. Add tokens in-place (taking their index as reference)
  for (const [i, token] of reverse([...inPlaceTokens.entries()])) targets.splice(i, 0, token)

  // 2. Add tokens in their locked index to buffer
  const buffer: (Token | undefined)[] = []
  for (const token of lockedTokens) buffer[token.attributes.traversalIndex!] = token

  // 3. Add from buffer to targets
  for (const [i, token] of reverse([...buffer.entries()])) if (token) targets.splice(i, 0, token)

  // 4. Traverse targets
  for (const target of targets) {
    if (target instanceof Token) iteratee(node, target)
    else inOrder(target, iteratee, maxDepth)
  }
}
