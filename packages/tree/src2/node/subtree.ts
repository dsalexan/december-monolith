import assert from "assert"
import { isBoolean, isNumber, isString, last, subtract, uniqBy } from "lodash"

import { Range, Interval, Point, typing } from "@december/utils"

import churchill, { Block, paint, Paint } from "../logger"

import { BY_TYPE } from "../type/styles"

import print from "./printer"
import { Node } from "./node/base"

import { inContext, inOrder, postOrder, preOrder } from "./traversal"
import { NODE_BALANCING } from "./node/type"
import { NIL, STRING } from "../type/declarations/literal"
import { LIST } from "../type/declarations/enclosure"

import { NodeCloningOptions } from "./node/factories"
import { ProvidedString, StringProvider } from "../string"
import { NodeCollectionOperationOptions } from "./node/collection"
import { KEYWORD_GROUP } from "../type/declarations/keyword"
import { getType } from "../type"
import Token from "../token"
import NodeFactory from "./factory"
import { evaluateTreeScope } from "./scope"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

type Nullable<T> = T | null

export interface TreeCloningOptions extends NodeCloningOptions {}

export interface InsertOptions extends NodeCollectionOperationOptions {
  ignoreSyntacticalParent: boolean
}

export default class SubTree {
  public root: Node

  constructor(root: Node) {
    this.root = root
  }

  get height() {
    return this.root.height
  }

  /** Inserts a node in subtree */
  insert(node: Node, options: Partial<InsertOptions> = {}) {
    // global.__DEBUG = true // COMMENT
    global.__DEBUG_LABEL = `${node.lexeme}->${this.root.name}` // COMMENT

    if (global.__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL)).info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      _logger
        .add(paint.grey(`INSERT `)) //
        .add(paint.grey(`${node.range} `))
        .add(paint.grey(`"`))
        .add(BY_TYPE(node.type).bold(node.lexeme))
        .add(paint.grey(`" to `))
        .add(BY_TYPE(this.root.type)(this.root.name))
        .info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      console.log(`\n`)
    }

    // if (global.__DEBUG_LABEL === `+->=3.a`) debugger

    assert(node.type.syntactical, `Type "${node.type.name}" has no syntactical rules`)

    let nextTarget: Nullable<Node> = null

    // ===============================================================================
    //                       PROPERLY INSERTING NODE IN SUBTREE
    // ===============================================================================

    if (!options.ignoreSyntacticalParent && node.type.syntactical.parent) {
      // ERROR: Untested
      if (node.type.id !== `keyword`) debugger

      // try to find an ancestor matching parent
      const ancestor = this.root.findAncestor(ancestor => node.type.syntactical!.parent!.match(ancestor))

      if (ancestor) return new SubTree(ancestor).insert(node, { ...options, ignoreSyntacticalParent: true })
    }

    // TODO: Implement this

    if (node.type.modules.includes(`operand`) || options.asOperand) nextTarget = insertOperand(this.root, node, options)
    else if (node.type.id === `operator`) nextTarget = insertOperator(this.root, node, options)
    else if (node.type.id === `separator`) nextTarget = insertSeparator(this.root, node, options)
    else if (node.type.id === `enclosure`) {
      if (node.type.modules.includes(`wrapper`)) nextTarget = insertWrapper(this.root, node, options)
      else throw new Error(`Unimplemented NON-WRAPPER enclosure type "${node.type.name}"`)
    } else if (node.type.id === `keyword`) nextTarget = insertKeyword(this.root, node, options)
    else throw new Error(`Unimplemented node type "${node.type.name}"`)

    assert(nextTarget, `New target node not set`)

    // ===============================================================================
    //                   END OF PROPERLY INSERTING NODE IN SUBTREE
    // ===============================================================================

    // if (global.__DEBUG_LABEL === `]->L5.b`) debugger

    if (global.__DEBUG) {
      // if (global.__DEBUG_LABEL === `-->×1.a`) debugger

      const expression = new SubTree(this.root.root).expression()

      print(this.root.root, {
        expression,
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
            return node.id === nextTarget?.id
          },
        },
      })
      console.log(`\n`)
    }

    // if (global.__DEBUG_LABEL === `]->L5.b`) debugger
    // debugger

    return nextTarget
  }

  /** Verify and return resulting expression from subtree */
  expression(recompileProviders = false) {
    // 1. Verify that all tokens have the same provider signature
    const providers: Nullable<StringProvider>[] = []
    preOrder(this.root, node => {
      for (const token of node.tokens) {
        const signature = token.provider?.signature

        const provider = providers.find(provider => provider?.signature === signature)
        if (provider === undefined) providers.push(token.provider)
      }
    })

    // if (!recompileProviders) assert(providers.length === 1, `All tokens must have the same signature (and, thus, only one provider)`)

    // 1. Verify that all tokens have an assigned interval
    let thereAreTokensLackingInterval = false
    preOrder(this.root, node => {
      // @ts-ignore
      for (const token of node.tokens) if (token._interval === null) thereAreTokensLackingInterval = true
    })

    assert(!thereAreTokensLackingInterval, `All tokens must have an assigned interval`)

    const isSingleValidProvider = providers.length === 1 && providers[0] !== null
    const haveMultipleProviders = providers.length > 1

    const shouldRecalculate = !isSingleValidProvider || haveMultipleProviders || thereAreTokensLackingInterval // should recalculate ranges if there are multiple providers or some tokens are lacking interval

    if (!recompileProviders && !shouldRecalculate) return providers[0]!.value

    // 2. Recalculate expression (because not all tokens have the same provider OR some tokens are lacking interval)

    let expression = ``
    let cursor = 0
    inOrder(this.root, (node, token, { ignorable }) => {
      if (ignorable) debugger

      if (token instanceof Token) {
        // if (token.provider) debugger

        const lexeme = token.lexeme

        expression += lexeme
        token.updateInterval(Interval.fromLength(cursor, lexeme.length))

        cursor += lexeme.length
      } else {
        // TODO: Untested
        debugger
      }
    })

    // TODO: What to do here? I don't know if the providers are the same in upper tree...
    if (this.root.type.name !== `root`) debugger

    // update root fallback range
    if (this.root.type.name === `root`) this.root.updateFallbackRange(Range.fromLength(0, expression.length).addEntry(new Point(0)).addEntry(new Point(expression.length)))

    // create and update provider for all tokens
    const provider = new StringProvider(expression)
    postOrder(this.root, node => {
      for (const token of node.tokens) {
        const string: ProvidedString = {
          type: `provided`,
          //
          start: token.interval.start,
          length: token.interval.length,
          //
          provider,
        }

        token.updateString(string)
      }
    })

    return expression
  }

  /** Verify and return resulting value from subtree */
  value(recompileProviders = false) {
    const result = this.expression(recompileProviders)

    if (this.height === 2 && this.root.children.length === 1) {
      const type = this.root.children.get(0).type
      let targetType: typing.VariableType | null = null

      if (type.name === `string`) targetType = `string`
      else if (type.name === `number`) targetType = `number`
      else if (type.name === `boolean`) targetType = `boolean`
      else throw new Error(`Unimplemented type "${type.name}"`)

      if (targetType) return typing.asType(result, targetType)
    }

    return result
  }

  // /** Recalculate ranges and expression */
  // recalculate() {
  //   if (this.root.type.name !== `root`) debugger

  //   // TODO: Improve this method to recalculate ranges

  //   let expression = ``

  //   // recalculate ranges and final expression
  //   let cursor = 0
  //   inOrder(this.root, (node, token, {ignorable}) => {
  //     if (ignorable) debugger

  //     // if (node._range) debugger

  //     if (!token) {
  //       debugger
  //     } else {
  //       const length = token.interval.length
  //       expression += token.lexeme

  //       assert(length === token.lexeme.length, `Length mismatch`)

  //       token.updateInterval(Interval.fromLength(cursor, length))
  //       cursor += length
  //     }
  //   })

  //   // update root fallback range
  //   if (this.root.type.name !== `root`) debugger
  //   if (this.root.type.name === `root`) this.root.updateFallbackRange(Range.fromLength(0, expression.length).addEntry(new Point(0)).addEntry(new Point(expression.length)))

  //   // update local expression for all tokens
  //   postOrder(this.root, node => node.tokens.map(token => token.updateExpression(expression)))

  //   return expression
  // }

  /** Clone SubTree */
  clone(options: Partial<TreeCloningOptions> = {}) {
    const tree = new SubTree(this.root.clone(options))

    const queue = [this.root]

    // replicate
    while (queue.length) {
      const originalParent = queue.shift()!

      const parent = tree.root.find(node => node.id === originalParent.id)!

      assert(parent, `Parent node not found`)

      // insert node at ST
      for (const originalNode of originalParent.children.nodes) {
        const node = originalNode.clone(options)

        node.setAttributes({
          ...(node.attributes ?? {}),
          originalNodes: [originalNode],
        })

        parent.children.add(node, null, { refreshIndexing: false })

        queue.push(originalNode) // enqueue child
      }
    }

    tree.root.refreshIndexing()

    return tree
  }
}

/** Inserts an operand in subtree */
function insertOperand(subtree: Node, operand: Node, options: Partial<InsertOptions> = {}): Nullable<Node> {
  assert(operand.type.modules.includes(`operand`) || options.asOperand, `Node is not an operand`)

  // append it to subTree as a child, priority is kind of irrelevant
  //    but operands always have the HIGHEST priorities among all types (whitespace is ∞, literal is like 10^10)
  subtree.syntactical.addNode(operand, undefined, options)

  // target continues to be the same
  return subtree
}

/** Inserts an operator in subtree */
function insertOperator(subtree: Node, operator: Node, options: Partial<InsertOptions> = {}): Nullable<Node> {
  const { priority: subTreePriority, arity: subtreeArity } = subtree.type.syntactical!
  const { priority: operatorPriority, arity, incompleteArity } = operator.type.syntactical!

  const subTreeRelevantChildren = subtree.children.filter(child => {
    if (subtree.type.modules.includes(`arithmetic`) || subtree.type.modules.includes(`logical`)) {
      if (child.type.name === `whitespace`) return false
      if (child.type.name === `list` && child.children.every(grandchild => grandchild.type.name === `whitespace`)) return false
    }

    return true
  })

  // if (global.__DEBUG_LABEL === `+->L2.b`) debugger // COMMENT

  const priorityComparison = operator.comparePriority(subtree, `syntactical`)

  // subtree MORE PRIORITARY than node
  //    operatorPriority > subTreePriority
  if (priorityComparison === 1) {
    // insert node between TARGET and its last child
    //    i.e. last child becomes child of new node, new node becomes last child of current
    //    i.e².

    // ERROR: untested
    if (arity !== 2) debugger

    // handle subtree children
    if (subtree.type.modules.includes(`arithmetic`)) debugger
    if (subTreeRelevantChildren.length === 0) {
      //  subtree are no children to enlist
      //    create and add a nil token as last (and, well, only) child

      const fallbackRange = Range.fromPoint(Range.point(subtree.range, `internal`, `first`, subtree.type.name === `root`))
      // const fallbackRange = Range.fromPoint(this.point(`internal`, `first`, subtree))
      const nil = NodeFactory.NIL(fallbackRange)
      subtree.syntactical.addNode(nil, undefined, options)
    } else {
      //  subtree has children
      //    subtree is just a collection, enlist all children of subtree

      //    subtree is not yet "full" (as per n-arity)
      // if (subtreeArity !== Infinity && subTreeRelevantChildren.length < subtreeArity) debugger

      //    but... subtree IS NOT a collection proper (it has some arity)
      if (subtreeArity !== Infinity) {
        if (subTreeRelevantChildren.length < subtreeArity) debugger
        if (subTreeRelevantChildren.length > subtreeArity) debugger

        // so just group its last child
        subtree.groupChildren([subtree.children.length - 1, subtree.children.length - 1], undefined, options)
      } else subtree.groupChildren([0, subtree.children.length - 1], undefined, options) // enlist all children of target
    }

    // add node in lastChild's place (as it's parent)
    // add operator between lastChild and subtree
    //    i.e. add operator as lastChild's parent
    subtree.syntactical.addNode(operator, subtree.children.length - 1, { ...options, preserveExistingNode: true, refreshIndexing: false })

    // since we inserted it between current and its last child, return current as new target
    //    return operator
  } else if (subTreeRelevantChildren.length < subtreeArity) {
    // basically handling negative/positive signs
    //    i.e. "-10" or "+1", operator without a left operand

    // here operator priority is <= subtree priority
    //    and we only know that the SUBTREE is not yet full (well, not full enough to reject another operator)
    //    (if it is full it should not nest another operator)

    // operator is not "allowed" to have an incomplete arity (so maybe add it as a syntatical rule)
    assert(incompleteArity, `Operator is not cleared for incomplete arity`)

    // TODO: Untested
    if (arity !== 2) debugger

    let parent = subtree

    // if we are here, it means that the subtree is not full (it has less children than its arity)
    //    but the "children" count disregards whitespaces (or list > whitespaces) for arithmetic/logical operators
    //    this is only applicable to FINITE arities

    assert(subtreeArity !== Infinity, `Subtree arity is infinite`)

    if (subtree.type.modules.includes(`arithmetic`) || subtree.type.modules.includes(`logical`)) {
      const lastChild = subtree.children.nodes[subtree.children.length - 1]
      const isWhitespace = lastChild.type.name === `whitespace`
      const isDeepWhitespace = lastChild.type.name === `list` && lastChild.children.every(grandchild => grandchild.type.name === `whitespace`)

      // if last child is a whitespace just group it AND add new operator to it
      if (isWhitespace || isDeepWhitespace) {
        // group last child
        parent = subtree.groupChildren([subtree.children.length - 1, subtree.children.length - 1], undefined, options)
      }
    }

    parent.syntactical.addNode(operator, undefined, options) // add operator as a child of subtree (or last child of subtree in a VERY specific scenario)
    const nil = NodeFactory.NIL(operator)

    // TODO: This would probably be different for any arity !== 2
    operator.syntactical.addNode(nil, undefined, options) // add nil as left operand of operator

    // it is basically the same as before, we are just adding a nil as left operand
    //    and always adding operator as the NEXT child (not last)
    //    return operator
  } else {
    // operator IS LESS OR EQUALLY* PRIORITARY than subtree
    //    *: (unless subtree is not full)
    //    try to insert operator in subtree's parent (i.e. higher in the tree)

    assert(subtree.parent, `Subtree has no parent`)

    // climb until we find a SUBTREE with lower or equal priority to the OPERATOR to add it there
    //    i.e. until OPERATOR is of higher priority than SUBTREE
    new SubTree(subtree.parent!).insert(operator, options)

    // we just inserted it higher in the tree, it doesn't change that the next thing (most likely an operator) should be added
    // to operator
    //    return operator
  }

  return operator
}

/** Inserts an wrapper enclosure (enclosure with delimited opener and closer) in subtree */
function insertWrapper(subtree: Node, wrapper: Node, options: Partial<InsertOptions> = {}): Nullable<Node> {
  // get contextualized variant
  let variant = getVariant(wrapper)
  if (variant === `opener-and-closer`) {
    // if variant is opener-and-closer, we need to determine if it's an opener or closer based on ancestry
    const openerAncestor = subtree.findAncestor(ancestor => ancestor.type.name === wrapper.type.name && ancestor.balancing === NODE_BALANCING.UNBALANCED && getVariant(ancestor) === `opener-and-closer`)

    variant = openerAncestor ? `closer` : `opener`
  }

  // if it's an opener, just add it to the subtree
  if (variant === `opener`) return subtree.syntactical.addNode(wrapper, undefined, options)

  // if it's a closer
  if (variant === `closer`) {
    // find the corresponding opener

    // find first opener wrapper context in ancestry
    const openerAncestor = subtree.findAncestor(
      ancestor =>
        ancestor.type.name === wrapper.type.name && // same type
        ancestor.balancing === NODE_BALANCING.UNBALANCED && // unbalanced
        (getVariant(ancestor) === `opener` || getVariant(ancestor) === `opener-and-closer`), // opener
    )

    // cant close wrapper, (probably an unbalanced character)
    if (!openerAncestor) {
      // just convert node to literal
      // throw new Error(`Unbalanced closer wrapper`)

      wrapper.setType(STRING)
      wrapper.attributes.unbalanced = true
      subtree.syntactical.addNode(wrapper, undefined, options)

      return subtree
    }

    // closer dont need to be added to the tree
    // just update opener's tokens
    openerAncestor.addToken(wrapper.tokens)

    // return opener's parent (since there is nothing more inside the wrapper, we just closed it)
    return openerAncestor.parent
  }

  throw new Error(`Unimplemented variant "${variant}" for separator`)
}

/** Inserts an separator in subtree */
function insertSeparator(subtree: Node, separator: Node, options: Partial<InsertOptions> = {}): Nullable<Node> {
  // TODO: hum... weird
  if (separator.type.name === `list`) debugger

  // climb tree (inContext) until we find the START of a HIGH PRIORITY context
  const master = subtree.findByTraversal(inContext, ancestor => {
    // 1. ignore lists, they are primitive separators (and only algorithmically created, never from lexemes)
    if (ancestor.type.name === `list`) return false

    // 2. is a higher priority separator
    if (ancestor.type.id === `separator` && ancestor.type.name === separator.type.name) return true

    return false
  })

  if (!master) {
    // no eligible separator context found
    //    so just create a new one
    // 1. Enlist everything already in subtree (they will be the first child of the new separator)
    const beforeList = subtree.groupChildren([0, subtree.children.length - 1], undefined, options)
    beforeList.updateFallbackRange(Range.fromPoint(separator.tokens[0].interval.start)) // fallback range is separators first token

    // add separator in place of fresh list
    subtree.syntactical.addNode(separator, 0, { ...options, preserveExistingNode: true, refreshIndexing: false })

    // create new list for next tokens
    const emptyList = NodeFactory.LIST(Range.fromPoint(last(separator.tokens)!.interval.end + 1))
    separator.syntactical.addNode(emptyList, undefined, options)

    // empty list is new target, future tokens should be inserted in its subtree
    return emptyList
  }

  // we found "master", i.e. the first separator in context-ancestry
  assert(master.type.name === separator.type.name, `Separator mismatch`)

  // make emptyList to act as new target for future tokens (but as a child of master separator)
  const fallbackRange = Range.fromPoint(separator.range.column(`last`) + 1)
  const emptyList = NodeFactory.LIST(fallbackRange)
  master.syntactical.addNode(emptyList, undefined, options)

  // update master tokens

  // ERROR: Never tested
  if (separator.tokens.length !== 1) debugger
  master.addToken(separator.tokens[0])

  // empty list is new target, future tokens should be inserted in its subtree
  return emptyList
}

/** Inserts a keyword in subtree */
function insertKeyword(subTree: Node, keyword: Node, options: Partial<InsertOptions> = {}): Nullable<Node> {
  const { priority } = keyword.type.syntactical!

  // add keyword to matched ancestor (or subTree if no ancestor found)
  const parent = subTree

  // TODO: Untested
  if (parent.type.syntactical!.arity !== 3) debugger

  const { arity } = keyword.type.syntactical!

  // TODO: N-ary keywords should act how? Just aggregating all children? Or are funcionally the same as unary?

  // nullary keywords should act as literals
  if (arity === 0) {
    // just add keyword to parent
    //    any movement or grouping should be handled by semantical rules in the type
    parent.syntactical.addNode(keyword, undefined, options)

    // parent should be the next target (since next new things should be added to it)
    return parent
  }
  // Unary keywords should act as separators in its parent (assigning itself a list and passing it as next target)
  // Binary keywords should act as operators in its parent (grouping existing children of parent as its first child and creating another list-child to pass as next target)
  else if (arity === 1 || arity === 2) {
    // ONLY IF THERE IS NO KEYWORD ALREADY IN PARENT
    let beforeList: Nullable<Node> = null
    if (parent.children.filter(child => child.type.id === `keyword`).length === 0) {
      // group existing children
      //    they will be the first child of the parent
      beforeList = parent.groupChildren([0, parent.children.length - 1], undefined, { ...options, refreshIndexing: false })
      beforeList.updateFallbackRange(Range.fromPoint(keyword.tokens[0].interval.start)) // fallback range is keyword's first token
    }

    // add keyword to parent (as a keyword group)
    const name = keyword.content

    assert(name, `Keyword must have content to name a group`)

    keyword.setType(KEYWORD_GROUP)
    keyword.setAttributes({ group: name! })

    const _options = arity === 1 ? options : { ...options, refreshIndexing: false }
    parent.syntactical.addNode(keyword, undefined, _options)

    // if keyword is UNARY
    if (arity === 1) {
      //    keyword (now as a list) is next target, future tokens should be inserted in it
      return keyword
    }
    // if keyword is BINARY
    else {
      assert(beforeList, `BeforeList is missing for binary keyword`)

      // add beforeList as its first child
      keyword.syntactical.addNode(beforeList, undefined, { ...options, refreshIndexing: false })

      // create new empty list as second child, and pass it as next target
      const emptyList = NodeFactory.LIST(Range.fromPoint(last(keyword.tokens)!.interval.end + 1))
      keyword.syntactical.addNode(emptyList, undefined, options)

      return emptyList
    }
  } else throw new Error(`Unimplemented arity "${arity}" for keyword`)
}

/** Get "variant" attribute from tokens */
function getVariant(node: Node) {
  const tokens = node.tokens

  // TODO: Implement for multiple tokens
  if (tokens.length > 1) debugger

  return tokens[0].attributes?.variant
}
