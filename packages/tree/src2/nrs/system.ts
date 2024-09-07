import { mergeWith, reverse } from "lodash"

import { mergeWithDeep } from "@december/utils"

import Node, { print, SubTree } from "../node"
import { postOrder, preOrder } from "../node/traversal"
import type Grammar from "../type/grammar"

import churchill, { Block, paint, Paint } from "../logger"

import { Rule, IReplacementCommand, RuleMatchState, KEEP_NODE } from "./rule"
import { ReplacementContext } from "./rule/replacement"
import { RuleSet } from "./rule/rule"
import { BY_TYPE } from "../type/styles"
import assert from "assert"

export { KEEP_NODE, REMOVE_NODE, REPLACE_NODES_AT } from "./rule"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export function process1(rulesets: RuleSet[], root: Node, context: ReplacementContext) {
  // compile nodes in post order
  const order: Node[] = []
  postOrder(root, node => order.push(node))

  const _order = order.map(node => node.name)

  // post order so we change children before parents
  for (let i = 0; i < order.length; i++) {
    const node = order[i]

    let __DEBUG = true // COMMENT
    // __DEBUG = global.__DEBUG // COMMENT
    global.__DEBUG_LABEL_NRS = `${context.mutationTag}[${context.run}]:${node.name}` // COMMENT

    // if (global.__DEBUG_LABEL_NRS === `1->+4.0*`) debugger // COMMENT

    const _type = node.type
    const _name = node.name
    const _content = node.content
    const _range = node.range.toString()

    // if (_name === `κ5.a`) debugger

    node.scope = context.scopeManager.evaluate(node)

    const mutation = execRulesets(rulesets, node, context)
    if (mutation === null) {
      if (__DEBUG) {
        console.log(`\n`)
        _logger.add(paint.grey(global.__DEBUG_LABEL_NRS)).info()
        _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
        _logger
          .add(paint.grey(`NRS (${context.mutationTag.toUpperCase()}) `)) //
          .add(paint.grey(`${_range} `))
          .add(BY_TYPE(_type).dim(_name))
          .add(paint.grey(` "`))
          .add(BY_TYPE(_type).bold(_content))
          .add(paint.grey(`" `))
          .add(paint.grey.bold(`(no mutation)`))
          .info()
        _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      }

      continue
    }

    const mutatedNode = applyRule(node, mutation, context)
    if (mutatedNode === null) {
      if (__DEBUG) {
        console.log(`\n`)
        _logger.add(paint.grey(global.__DEBUG_LABEL_NRS)).info()
        _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
        _logger
          .add(paint.grey(`NRS (${context.mutationTag.toUpperCase()}) `)) //
          .add(paint.grey(`${_range} `))
          .add(BY_TYPE(_type).dim(_name))
          .add(paint.grey(` "`))
          .add(BY_TYPE(_type).bold(_content))
          .add(paint.grey(`" `))
          .add(paint.grey.bold(`(no mutation)`))
          .info()
        _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      }

      continue
    }

    if (__DEBUG) {
      console.log(`\n`)
      _logger.add(paint.grey(global.__DEBUG_LABEL_NRS)).info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
      _logger
        .add(paint.grey(`NRS (${context.mutationTag.toUpperCase()}) `)) //
        .add(paint.grey(`${_range} `))
        .add(BY_TYPE(_type).dim(_name))
        .add(paint.grey(` "`))
        .add(BY_TYPE(_type).bold(_content))
        .add(paint.grey(`" -> `))
        .add(BY_TYPE(mutatedNode.type).dim(mutatedNode.name))
        .add(paint.grey(` "`))
        .add(BY_TYPE(mutatedNode.type).bold(mutatedNode.content))
        .add(paint.grey(`" `))
        .add(paint.grey(`${mutatedNode.range} `))
        .info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()

      const expression = new SubTree(root.root).expression()

      print(root.root, {
        expression,
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
      console.log(`\n`)
    }

    // if (global.__DEBUG_LABEL_NRS === `semantic[2]:f2.a`) debugger // COMMENT

    // since node was changed, re-process its subtree (RISK OF STACK OVERFLOW)
    process(rulesets, mutatedNode, { ...context, run: context.run + 1 })
  }
}

export function process(rulesets: RuleSet[], root: Node, context: ReplacementContext) {
  const queue: Node[] = [root]

  while (queue.length) {
    const node = queue.shift()!

    const result = processNode(rulesets, node, context)

    const target = result === false ? node : result

    for (const child of target.children.nodes) queue.push(child)
  }
}

function processNode(rulesets: RuleSet[], node: Node, context: ReplacementContext) {
  let __DEBUG = false // COMMENT
  // __DEBUG = global.__DEBUG // COMMENT
  global.__DEBUG_LABEL_NRS = `${context.mutationTag}[${context.run}]:${node.name}` // COMMENT

  // if (global.__DEBUG_LABEL_NRS === `1->+4.0*`) debugger // COMMENT

  // if (_name === `κ5.a`) debugger

  node.scope = context.scopeManager.evaluate(node)

  const parent = node.parent!
  const index = node.index
  const mutations = node.attributes.mutations

  const _type = node.type
  const _name = node.name
  const _content = node.content
  const _range = node.range.toString()

  if (__DEBUG) {
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

  // 1. Run node against rulesets to detect mutations
  const mutation = execRulesets(rulesets, node, context)
  if (mutation === null) {
    if (__DEBUG) {
      _logger.add(paint.grey.bold.italic(` ->  (no mutation)`)).info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    }

    return false
  }

  // 2. Mutate node according to matches in rulesets
  const mutatedNode = applyRule(node, mutation, context)
  if (mutatedNode === null) {
    if (__DEBUG) {
      _logger.add(paint.grey.bold.italic(` ->  (no mutation)`)).info()
      _logger.add(paint.grey.dim.italic(mutation.rule.name)).info()
      _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    }

    return false
  }

  // if (global.__DEBUG_LABEL_NRS === `semantic[2]:L1.a`) debugger

  // 3. Keep tree integrity
  if (mutatedNode.id !== node.id) {
    // merge mutations
    mutatedNode.attributes.mutations = mergeWithDeep(mutatedNode.attributes.mutations, mutations, (currentValue, newValue) => {
      debugger
      return newValue
    })

    assert(mutatedNode.index === index, `Mutated Node should no chande indexes`)
    assert(mutatedNode.parent?.id === parent.id, `Mutated Node should no chande parent`)
  }

  if (__DEBUG) {
    _logger
      .add(paint.grey(` -> `))
      .add(BY_TYPE(mutatedNode.type).dim(mutatedNode.name))
      .add(paint.grey(` "`))
      .add(BY_TYPE(mutatedNode.type).bold(mutatedNode.content))
      .add(paint.grey(`" `))
      .add(paint.grey(`${mutatedNode.range} `))
      .info()
    _logger.add(paint.grey.dim.italic(mutation.rule.name)).info()
    _logger.add(paint.grey(`-----------------------------------------------------------------`)).info()
    console.log(`\n`)

    print(mutatedNode.root, {
      expression: new SubTree(mutatedNode.root).expression(),
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

  // if (global.__DEBUG_LABEL_NRS === `semantic[2]:f2.a`) debugger // COMMENT

  // 4. since node was changed, re-process its subtree (RISK OF STACK OVERFLOW)
  process(rulesets, mutatedNode, { ...context, run: context.run + 1 })

  return mutatedNode
}

function execRulesets(rulesets: RuleSet[], node: Node, context: ReplacementContext) {
  const localGrammars: Record<string, Grammar> = Object.fromEntries(rulesets.map(ruleset => [ruleset.name, ruleset.grammar.length ? context.grammar.clone(ruleset.grammar) : context.grammar]))

  const rules = rulesets.map(ruleset => [...ruleset.rules.values()].map(rule => [ruleset, rule] as const)).flat()

  for (const [ruleset, rule] of rules) {
    const localGrammar = localGrammars[ruleset.name]

    const shouldIgnore = node.attributes.mutations && node.attributes.mutations[context.mutationTag]?.[ruleset.name]?.[rule.name] !== undefined
    if (shouldIgnore) continue

    const result = execRule(rule, node, { ...context, grammar: localGrammar })

    if (result === null) continue
    if (result.command.type === `KEEP_NODE`) continue

    // mutating command, stop executing rules
    return { ...result, ruleset: ruleset.name, rule }
  }

  return null
}

function execRule(rule: Rule, node: Node, context: ReplacementContext): Pick<NRSMutation, `command` | `match`> | null {
  const match = rule.match(node)

  if (!match.result) return null

  // TODO: Implement a "flat toString" for node, showing a inline name representation for the node
  // TODO: Store this inline flat toString in changes

  const command = rule.replace(node, match, context) // replace current node with the new node

  return { command, match }
}

function applyRule(originalNode: Node, mutation: NRSMutation, context: ReplacementContext) {
  // if (global.__DEBUG_LABEL === `L1.a`) debugger // COMMENT

  const { operationOptions } = context
  const { command } = mutation

  let node: Node | null = null

  if (command.type === `KEEP_NODE`) {
    // do nothing
  } else if (command.type === `REMOVE_NODE`) originalNode.parent!.children.remove(originalNode, operationOptions)
  else if (command.type === `REPLACE_NODE`) {
    originalNode.syntactical.replaceWith(command.node, { ...operationOptions, preserveExistingNode: command.refreshIndexing ?? operationOptions?.refreshIndexing })

    node = command.node
  } else if (command.type === `REPLACE_NODES_AT`) {
    for (const index of reverse(command.indexes)) originalNode.children.remove(index, { refreshIndexing: false })
    originalNode.syntactical.addNode(command.node, command.indexes[0], operationOptions)

    node = originalNode
  } else if (command.type === `ADD_NODE_AT`) {
    originalNode.syntactical.addNode(command.node, command.index, { ...operationOptions, preserveExistingNode: command.preserveExistingNode ?? operationOptions?.preserveExistingNode })

    node = originalNode
  } else throw new Error(`Invalid node replacement action "${(command as any).type}"`)

  // register mutation
  if (node) {
    node.attributes.mutations ??= {}
    node.attributes.mutations[context.mutationTag] ??= {}
    node.attributes.mutations[context.mutationTag][mutation.ruleset] ??= {}
    node.attributes.mutations[context.mutationTag][mutation.ruleset][mutation.rule.name] = mutation
  }

  return node
}

export interface NRSMutation {
  ruleset: string
  rule: Rule
  command: IReplacementCommand
  match: RuleMatchState
}

export type NRSMutationMap = Record<string, Record<string, NRSMutation>> // ruleset -> rule -> mutation
