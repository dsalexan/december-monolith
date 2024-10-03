import assert from "assert"
import Node from "../../node"

import { BindingResult, RuleMatch, RuleMatchFunction, RuleMatchResult, RuleMatchState } from "./match"
import { IReplacementCommand, IRuleReplacement, REPLACE_NODE, ReplacementContext } from "./replacement"
import { isArray, reverse } from "lodash"
import Type from "../../type/base"
import { MaybeArray } from "tsdef"
import Grammar from "../../type/grammar"

export default class Rule {
  name: string
  matchingFunctions: RuleMatch[]
  replacementFunction: IRuleReplacement

  constructor(name: string, matchingFunctions: (RuleMatch | RuleMatchFunction)[], replacementFunction: IRuleReplacement) {
    this.name = name
    this.matchingFunctions = matchingFunctions.map(match => RuleMatch.from(match))
    this.replacementFunction = replacementFunction
  }

  replace(node: Node, match: RuleMatchState, context: ReplacementContext): IReplacementCommand {
    assert(match.result, `Rule should only be executed if all mandatory matches are true`)

    const newNode = this.replacementFunction(node, match, context)

    assert(newNode !== undefined, `Replacement function should return a command, node or null`)

    return newNode instanceof Node ? REPLACE_NODE(newNode) : newNode
  }

  match(originalNode: Node): RuleMatchState {
    const matches: BindingResult[] = []

    for (let index = 0; index < this.matchingFunctions.length; index++) {
      const match = this.matchingFunctions[index]

      const { out, result } = match.exec(originalNode)

      matches.push({ result, out, match })
    }

    const mandatory = matches.filter(({ result, match }) => !match.optional)
    const optional = matches.filter(({ result, match }) => match.optional)

    const result = mandatory.length === 0 ? optional.some(({ result }) => result === true) : mandatory.every(({ result }) => result === true)

    return {
      matches,
      result,
    }
  }

  /** Execute rule against node to determine if a mutation is necessary */
  exec(node: Node, context: ReplacementContext): { command: IReplacementCommand; match: RuleMatchState } | null {
    // 1. Match rule against node
    const match = this.match(node)
    if (!match.result) return null

    // TODO: Implement a "flat toString" for node, showing a inline name representation for the node
    // TODO: Store this inline flat toString in changes

    // 2. Mutate node accoding to rule
    const command = this.replace(node, match, context) // replace current node with the new node

    return { command, match }
  }

  /** Apply rule's mutation to node */
  static apply(originalNode: Node, mutation: NRSMutation, context: ReplacementContext) {
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
}

export class RuleSet {
  name: string
  rules: Map<string, Rule>
  grammar: Type[]

  constructor(name: string) {
    this.name = name
    this.rules = new Map()
    this.grammar = []
  }

  addRule(rule: Rule): this {
    this.rules.set(rule.name, rule)

    return this
  }

  addFunctions(name: string, matchingFunctions: (RuleMatch | RuleMatchFunction)[], replacementFunction: IRuleReplacement): this {
    this.addRule(new Rule(name, matchingFunctions, replacementFunction))

    return this
  }

  add(rule: Rule): this
  add(name: string, matchingFunctions: MaybeArray<RuleMatch | RuleMatchFunction>, replacementFunction: IRuleReplacement): this
  add(ruleOrName: Rule | string, matchingFunctions?: MaybeArray<RuleMatch | RuleMatchFunction>, replacementFunction?: IRuleReplacement): this {
    if (ruleOrName instanceof Rule) {
      this.addRule(ruleOrName)
    } else {
      this.addFunctions(ruleOrName as string, (isArray(matchingFunctions) ? matchingFunctions : [matchingFunctions]) as RuleMatch[], replacementFunction as IRuleReplacement)
    }

    return this
  }

  addGrammar(...types: Type[]) {
    this.grammar.push(...types)

    return this
  }

  /** Execute a list of rulesets against node to detect possible mutations */
  static exec(rulesets: RuleSet[], node: Node, context: ReplacementContext): NRSMutation | null {
    // 1. Generate a localized grammar for each ruleset (since rulesets can have their own additions to the grammar)
    const localGrammars: Record<string, Grammar> = Object.fromEntries(rulesets.map(ruleset => [ruleset.name, ruleset.grammar.length ? context.grammar.clone(ruleset.grammar) : context.grammar]))

    // 2. Flat a list with all rules across rulesets
    const rules = rulesets.map(ruleset => [...ruleset.rules.values()].map(rule => [ruleset, rule] as const)).flat()

    // for each rule
    for (const [ruleset, rule] of rules) {
      const localGrammar = localGrammars[ruleset.name]

      // 3. Check if rule should be ignored
      const ruleAlreadyMutatedNode = node.attributes.mutations && node.attributes.mutations[context.mutationTag]?.[ruleset.name]?.[rule.name] !== undefined

      const shouldIgnore = ruleAlreadyMutatedNode
      if (shouldIgnore) continue

      // 4. Execute rule against node
      const result = rule.exec(node, { ...context, grammar: localGrammar })

      if (result === null) continue
      // if (result.command.type === `KEEP_NODE`) {
      //   debugger
      //   continue
      // }

      // return mutation command
      // stop trying rules (just execute the command later, we always retry rules after a mutation)
      return { ...result, ruleset: ruleset.name, rule }
    }

    return null
  }
}

export interface NRSMutation {
  ruleset: string
  rule: Rule
  command: IReplacementCommand
  match: RuleMatchState
}
