import { cloneDeep, mergeWith, reverse } from "lodash"

import { mergeWithDeep } from "@december/utils"

import Node, { print, SubTree } from "../node"
import { postOrder, preOrder } from "../node/traversal"
import type Grammar from "../type/grammar"

import churchill, { Block, paint, Paint } from "../logger"

import { Rule, IReplacementCommand, RuleMatchState, KEEP_NODE } from "./rule"
import { mutate, NODE_REMOVED, NRSMutation, ReplacementContext } from "./rule/replacement"
import { RuleSet } from "./rule/rule"
import { BY_TYPE } from "../type/styles"
import assert from "assert"

export { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT } from "./rule"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

/** Recursively process rulesets against tree */
export function process(rulesets: RuleSet[], node: Node, context: ReplacementContext) {
  // 1. Processed node (as many times as needed for ALL applicable rules to be applied)
  const result = processNode(rulesets, node, context)

  const nodeWasChanged = result !== false
  const processedNode = result instanceof Node ? result : node

  // 2. Process post-processed node's children (since they are the new state of the tree)
  let offspringWasChanged = false
  for (const child of processedNode.children.nodes) {
    const wasProcessed = process(rulesets, child, context)

    if (wasProcessed) offspringWasChanged = true
  }

  // 3. If any changes were made to node's offspring, re-process everything
  if (offspringWasChanged) process(rulesets, processedNode, { ...context, run: context.run + 1 })

  return nodeWasChanged || offspringWasChanged
}

/** Process rulesets against node, and return mutated node */
export function processNode(rulesets: RuleSet[], node: Node, context: ReplacementContext): Node | boolean {
  let __DEBUG = false // COMMENT
  // __DEBUG = global.__DEBUG // COMMENT
  global.__DEBUG_LABEL_NRS = `${context.mutationTag}[${context.run}]:${node.name}` // COMMENT

  // if (global.__DEBUG_LABEL_NRS === `1->+4.0*`) debugger // COMMENT

  // if (_name === `κ5.a`) debugger

  // 1. Evaluate scope
  node.scope = context.scopeManager.evaluate(node)

  const oldMutations = cloneDeep(node.attributes.mutations)
  const parent = node.parent!
  const index = node.index
  const root = node.root

  if (__DEBUG) DEBUG_1(node, context) // COMMENT

  // 2. Process rulesets against Node
  const mutation = RuleSet.exec(rulesets, node, context)
  if (mutation === null) {
    // no mutation for this node
    if (__DEBUG) DEBUG_2_no_mutation(node, null, context) // COMMENT

    return false
  }

  // 3. Apply mutation to node
  const mutatedNode = mutate(node, mutation, context)
  if (mutatedNode === null) {
    // no mutation for this node
    if (__DEBUG) DEBUG_2_no_mutation(node, mutation, context) // COMMENT

    return false
  }

  // if (global.__DEBUG_LABEL_NRS === `semantic[2]:L1.a`) debugger

  // 4. Keep tree integrity
  if (mutatedNode instanceof Node && mutatedNode.id !== node.id) {
    // merge mutations
    mutatedNode.attributes.mutations = mergeWithDeep(mutatedNode.attributes.mutations, oldMutations, (currentValue, newValue) => {
      debugger
      return newValue
    })

    assert(mutatedNode.index === index, `Mutated Node should no chande indexes`)
    assert(mutatedNode.parent?.id === parent.id, `Mutated Node should no chande parent`)
  }

  if (__DEBUG) DEBUG_3_tree(root, mutatedNode, mutation, context) // COMMENT

  // 5. If node was removed from tree (or similar, return true but no node)
  if (!(mutatedNode instanceof Node)) return true

  // 6. since node was changed, re-process its subtree (RISK OF STACK OVERFLOW)
  process(rulesets, mutatedNode, { ...context, run: context.run + 1 })

  return mutatedNode
}

function DEBUG_1(node: Node, context: ReplacementContext) {
  const _type = node.type
  const _name = node.name
  const _content = node.content
  const _range = node.range.toString()

  console.log(`\n`)
  _logger.add(paint.grey(global.__DEBUG_LABEL_NRS)).info()
  _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
  _logger.add(paint.grey(`NRS (${context.mutationTag.toUpperCase()}) `)).info()
  _logger
    .add(BY_TYPE(_type).dim(_name))
    .add(paint.grey(` "`))
    .add(BY_TYPE(_type).bold(_content))
    .add(paint.grey(`" `))
    .add(paint.grey(`    ${_range}`))
    .info()
}

function DEBUG_2_no_mutation(node: Node, mutation: NRSMutation | null, context: ReplacementContext) {
  _logger.add(paint.grey.bold.italic(` ->  (no mutation)`)).info()
  if (mutation) _logger.add(paint.grey.dim.italic(mutation.rule.name)).info()
  _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
}

function DEBUG_3_tree(root: Node, mutatedNode: Node | typeof NODE_REMOVED, mutation: NRSMutation, context: ReplacementContext) {
  if (mutatedNode instanceof Node)
    _logger
      .add(paint.grey(` -> `))
      .add(BY_TYPE(mutatedNode.type).dim(mutatedNode.name))
      .add(paint.grey(` "`))
      .add(BY_TYPE(mutatedNode.type).bold(mutatedNode.content))
      .add(paint.grey(`" `))
      .add(paint.grey(`${mutatedNode.range} `))
  else
    _logger
      .add(paint.grey(` -> `)) //
      .add(paint.red.bold.dim(mutatedNode.toString()))

  _logger.info()
  _logger.add(paint.grey.dim.italic(mutation.rule.name)).info()
  _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
  console.log(`\n`)

  print(root, {
    expression: new SubTree(root).expression(),
    // sequence: {
    //   minimumSizeForBracket: 0,
    //   minimumSizeForPipe: 1,
    //   padding: {
    //     character: `‾`,
    //   },
    // },
    style: {
      ignoreSpacing: false,
      alternateColors: false,
      // underlineFn(node) {
      //   return node.id === nextTarget?.id
      // },
    },
  })
}

export type NRSMutationMap = Record<string, Record<string, NRSMutation>> // ruleset -> rule -> mutation
