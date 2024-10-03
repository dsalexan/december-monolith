import { cloneDeep, mergeWith, reverse } from "lodash"

import churchill, { Block, paint, Paint } from "../logger"

import Node, { print, SubTree } from "../node"
import { ScopeManager } from "./../node/scope"
import { BY_TYPE } from "../type/styles"
import Grammar from "../type/grammar"
import { RuleSet, RuleSetExecutionContext, RuleSetMutationDescription } from "./ruleset"
import { Nullable } from "tsdef"
import assert from "assert"
import { NODE_REMOVED, NODE_UNCHANGED } from "./rule/mutation/mutation"
import Type from "../type/base"
import { Rule } from "./rule"

export const _logger = churchill.child(`nrs`, undefined, { separator: `` })

export interface NodeReplacementSystemContext extends RuleSetExecutionContext {
  tag: string
  run: number
  scope: ScopeManager
  grammar: Grammar
}

export type RuleExecutionID = string

export interface RuleSetMutationTrace {
  previousNodeState: {
    name: string
    content: string
    type: Type
  }
  processedNodeState: {
    name: string
    content: string
    type: Type
  }
}

export class NodeReplacementSystem {
  rulesets: RuleSet[]
  mutations: Record<Node[`id`], Record<RuleExecutionID, RuleSetMutationDescription & RuleSetMutationTrace>>

  setRulesets(rulesets: RuleSet[]) {
    this.rulesets = rulesets
    this.mutations = {}
  }

  /** Recursively process subtree */
  public process(node: Node, context: Omit<NodeReplacementSystemContext, `hash` | `wasRuleExecuted`>) {
    // 1. Process node (as many times as needed for ALL applicable rules to be applied)
    const mutatedNode = this.processNode(node, context)

    const nodeWasChanged = mutatedNode !== false
    const processedNode = mutatedNode instanceof Node ? mutatedNode : node

    // 2. Process post-processed node's children (since they are the new state of the tree)
    let offspringWasChanged = false
    for (const child of processedNode.children.nodes) {
      const wasProcessed = this.process(child, context)

      if (wasProcessed !== false) offspringWasChanged = true
    }

    if (nodeWasChanged || offspringWasChanged) processedNode.version++

    // 3. If any changes were made to node's offspring, re-process everything
    if (offspringWasChanged) this.process(processedNode, { ...context, run: context.run + 1 })

    return nodeWasChanged || offspringWasChanged
  }

  /** Process node (until there are no more changes, without repeting rules) */
  public processNode(node: Node, context: Omit<NodeReplacementSystemContext, `hash` | `wasRuleExecuted`>): Node | typeof NODE_REMOVED | false {
    let __DEBUG = false // COMMENT
    // __DEBUG = context.tag === `simplify` // COMMENT
    // __DEBUG = global.__DEBUG // COMMENT
    global.__DEBUG_LABEL_NRS = `${context.tag}[${context.run}]:${node.name}` // COMMENT

    // if (global.__DEBUG_LABEL_NRS === `simplify[2]:+1.a`) debugger // COMMENT

    const trace: RuleSetMutationTrace = {
      previousNodeState: {
        name: node.name,
        content: node.getDebugContent({ showType: false })!,
        type: node.type,
      },
      processedNodeState: {
        name: `—`,
        content: `—`,
        type: null as any,
      },
    }

    // 1. Evaluate scope
    const original = {
      root: node.root,
      parent: node.parent,
      index: node.index,
    }

    node.scope = context.scope.evaluate(node)

    if (__DEBUG) DEBUG_1(node, context) // COMMENT

    // 2. Mutate node according to rulesets (just A SINGLE RULE/MUTATION, we repeat processNode at the end if there were some mutation)
    const ruleSetContext: RuleSetExecutionContext = {
      ...context,
      hash: `${context.tag}`,
      wasRuleExecuted: (node, ruleExecutionID) => {
        const wasExecuted = this.mutations[node.getTreeHash()]?.[ruleExecutionID] !== undefined

        // if (ruleExecutionID === `simplify::simplify/stackOverflow::(_NonLiteral+_Literal1)+_Literal2 -> _NonLiteral+(_Literal1+_Literal2)`) debugger

        return wasExecuted
      },
    }

    let mutationDescription: Nullable<RuleSetMutationDescription> = null
    for (const ruleset of this.rulesets) {
      mutationDescription = ruleset.exec(node, ruleSetContext)
      if (mutationDescription) break
    }

    // if there was a mutation, keep track of it
    if (mutationDescription !== null) {
      const ruleExecutionID = mutationDescription.rule.getExecutionID(ruleSetContext.hash, mutationDescription.ruleset)

      // freeze processed node state for tracing
      if (mutationDescription.node instanceof Node) {
        trace.processedNodeState.name = mutationDescription.node.name
        trace.processedNodeState.content = mutationDescription.node.getDebugContent({ showType: false })!
        trace.processedNodeState.type = mutationDescription.node.type
      }

      const key = node.getTreeHash()

      this.mutations[key] ??= {}
      this.mutations[key][ruleExecutionID] = { ...mutationDescription, ...trace }
    }

    if (mutationDescription === null || mutationDescription.node === NODE_UNCHANGED) {
      // no mutation for this node
      if (__DEBUG) DEBUG_2_no_mutation(node, mutationDescription) // COMMENT

      return false
    }

    // if (global.__DEBUG_LABEL_NRS === `semantic[2]:L1.a`) debugger

    // 3. Keep tree integrity
    const { node: mutatedNode } = mutationDescription

    //      MutatedNode's parent should be the same as the original node's parent
    if (mutatedNode instanceof Node && mutatedNode.parent?.id !== original.parent?.id) {
      assert(mutatedNode.index === original.index, `Mutated Node should not change indexes`)
      assert(mutatedNode.parent?.id === original.parent?.id, `Mutated Node should not change parent`)
    }

    if (__DEBUG) DEBUG_3_tree(original.root, mutationDescription) // COMMENT

    // 4. since node was changed, re-process it (RISK OF STACK OVERFLOW)
    //      (ignore this if node was removed from tree)
    if (mutatedNode !== NODE_REMOVED) return this.processNode(mutatedNode, { ...context, run: context.run + 1 }) || mutatedNode

    return mutatedNode
  }

  public print(hash: string) {
    _logger.add(` `).info()
    _logger.add(paint.grey(`NRS Mutations`)).info()

    for (const [id, mutations] of Object.entries(this.mutations)) {
      const state = id.split(`::`)[1]

      _logger
        .add(paint.grey.dim(`    [`))
        .add(paint.grey(id.substr(0, 7)))
        .add(paint.grey.dim(`...::`))
        .add(paint.grey(state))
        .add(paint.grey.dim(`] `))
        .info()

      for (const { previousNodeState, processedNodeState, ...mutation } of Object.values(mutations)) {
        let color = paint.grey
        if (mutation.mutation?.type === `REMOVE_NODE`) color = paint.red.bold

        // Show less shit for non-relevant mutations
        if ([`ignore-whitespace`].includes(mutation.rule.name)) {
          _logger //
            .add(`        `)
            .add(paint.grey.dim(mutation.ruleset))
            .add(paint.grey.dim.bold(` ${mutation.rule.name} `))
            .add(paint.grey.dim(mutation.mutation?.type))
            .add(paint.grey.dim(`      ${Rule.getExecutionID(hash, mutation.ruleset, mutation.rule.name)}`))
            .info()

          continue
        }

        _logger //
          .add(`        `)
          .add(paint.grey.dim(mutation.ruleset))
          .add(paint.white(` ${mutation.rule.name} `))
          .add(color(mutation.mutation?.type))
          .add(`  `)
          .add(paint.grey.dim.bold(`|`))
          .add(`  `)

        _logger //
          .add(paint.grey.dim(`[`))
          .add(BY_TYPE(previousNodeState.type).dim(previousNodeState.name))
          .add(paint.grey.dim(`]`))
          .add(paint.grey.dim.bold(` "`))
          .add(BY_TYPE(previousNodeState.type).bold(previousNodeState.content))
          .add(paint.grey.dim.bold(`"`))

        _logger.add(paint.grey.dim.bold(` -> `))

        if (mutation.mutation?.type === `REMOVE_NODE`) _logger.add(paint.grey.bold(`N/A`))
        else {
          _logger //
            .add(paint.grey.dim(`[`))
            .add(BY_TYPE(processedNodeState.type).dim(processedNodeState.name))
            .add(paint.grey.dim(`]`))
            .add(paint.grey.dim.bold(` "`))
            .add(BY_TYPE(processedNodeState.type).bold(processedNodeState.content))
            .add(paint.grey.dim.bold(`" `))
        }

        _logger.add(paint.grey.dim(`      ${Rule.getExecutionID(hash, mutation.ruleset, mutation.rule.name)}`))
        _logger.info()
      }
    }
  }
}

// #region DEBUG

function DEBUG_1(node: Node, context: Omit<NodeReplacementSystemContext, `hash` | `wasRuleExecuted`>) {
  const _type = node.type
  const _name = node.name
  const _content = node.getDebugContent({ showType: false })
  const _range = node.tryGetRange()

  console.log(`\n`)
  _logger.add(paint.grey(global.__DEBUG_LABEL_NRS)).info()
  _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
  _logger.add(paint.grey(`NRS (${context.tag.toUpperCase()}) `)).info()
  _logger
    .add(BY_TYPE(_type).dim(_name))
    .add(paint.grey(` "`))
    .add(BY_TYPE(_type).bold(_content))
    .add(paint.grey(`" `))
    .add(paint.grey(`    ${_range}`))
    .info()
}

function DEBUG_2_no_mutation(node: Node, description: Nullable<RuleSetMutationDescription>) {
  if (description === null) _logger.add(paint.grey.bold.italic(` ->  (no mutation)`)).info()
  else {
    _logger
      .add(paint.grey(` -> `)) //
      .add(paint.red.bold.dim(String(description.node)))
      .info()

    _logger.add(paint.grey.dim.italic(description.rule.name)).info()
  }
  _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
}

function DEBUG_3_tree(root: Node, { node, rule, executionID }: RuleSetMutationDescription) {
  if (node instanceof Node)
    _logger
      .add(paint.grey(` -> `))
      .add(BY_TYPE(node.type).dim(node.name))
      .add(paint.grey(` "`))
      .add(BY_TYPE(node.type).bold(node.getDebugContent({ showType: false })))
      .add(paint.grey(`" `))
      .add(paint.grey(`${node.tryGetRange() ?? `<error>`} `))
  else
    _logger
      .add(paint.grey(` -> `)) //
      .add(paint.red.bold.dim(node.toString()))

  _logger.info()
  _logger.add(paint.grey.dim.italic(rule.name)).add(`    `).add(paint.grey.italic(executionID)).info()
  _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
  console.log(`\n`)

  try {
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
  } catch (error) {
    _logger.add(paint.red.italic(`(could not print tree)`)).info()
    root.debug()
  }
}

// #endregion
