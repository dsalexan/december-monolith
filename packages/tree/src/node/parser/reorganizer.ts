import { Dictionary, groupBy, isNil, last, sortBy, zip } from "lodash"
import type NodeParser from "."
import type Node from ".."
import { NodeParserOptions, NodeParserSetup, defaultOptions } from "./options"
import { Recipe, RecipeRestriction } from "../../recipe/recipe"
import { EnclosureRecipe } from "../../recipe/enclosure"
import { SeparatorRecipe } from "../../recipe/separator"
import { AggregatorRecipe } from "../../recipe/aggregator"
import { RecipeName } from "../../recipe"

const REORGANIZE_DIRECTIVES = [`unknown`, `list_inbetweeners`] as const

type ReorganizeDirective = (typeof REORGANIZE_DIRECTIVES)[number]

export default class NodeParserReorganizer {
  parser: NodeParser

  get node() {
    return this.parser.node
  }

  get options() {
    return this.parser.options
  }

  get setup() {
    return this.parser.setup
  }

  get recipes() {
    return this.node.tree.recipes
  }

  constructor(parser: NodeParser) {
    this.parser = parser
  }

  reorganize(): boolean {
    // prioritize children of node
    const prioritization = this._prioritize(this.node.children)
    if (!prioritization) return false

    let somethingWasReorganized = false

    for (const priority of prioritization.priorities) {
      const syntaxMap = prioritization.groups[priority]
      const syntaxes = Object.keys(syntaxMap) as RecipeName[]

      if (syntaxes.length > 1) debugger
      const syntax = syntaxes[0]

      const index = syntaxMap[syntax]

      somethingWasReorganized = somethingWasReorganized || this._reorganize(this.node, this.recipes.get(syntax), index)

      // validation, tree must remain, well, valid
      const validation = this.node.validate()
      if (!validation.success && this.node.validator.tree()) debugger
    }

    return somethingWasReorganized
  }

  _prioritize(nodes: Node[]) {
    const indexed = nodes
      .map((node, index) => {
        if (isNil(node.syntax.priority)) return null

        let priority = node.syntax.priority

        if (node.syntax.type === `separator`) {
          // only reorganize empty separators
          if (node.children.length > 0) priority = null
        }

        if (isNil(priority)) return null

        return {
          _node: node.context,
          node: index,
          syntax: node.syntax.name,
          priority,
        }
      })
      .filter(i => !isNil(i))

    if (indexed.length === 0) return null

    // group by priorities
    const priorityGroups = groupBy(indexed, `priority`)
    const priorities = Object.keys(priorityGroups)
      .map(priority => parseInt(priority))
      .sort()
      .reverse()

    const groups = {} as Dictionary<Record<RecipeName, ReorganizationIndex[]>>
    for (const priority of priorities) {
      const syntaxMap = groupBy(priorityGroups[priority], `syntax`)
      groups[priority] = syntaxMap as Record<RecipeName, ReorganizationIndex[]>
    }

    return {
      priorities,
      groups,
    }
  }

  _reorganize(target: Node, syntax: Recipe, reorganizationIndexes: ReorganizationIndex[]) {
    // decide HOW to reorganize this nodes
    let directive = this._decide(syntax, reorganizationIndexes)

    if (directive === `unknown`) debugger

    // relevant nodes to reorganization, always children to target
    const indexes = reorganizationIndexes.map(({ node }) => node)

    if (directive === `list_inbetweeners`) {
      const master = target.children[indexes[0]]

      // compile a subset with all nodes in between those relevant to reorganization
      const _inbetweeners = zip([0, ...indexes.map(i => i + 1)], [...indexes, target.children.length]) as [number, number][]
      const inbetweeners = _inbetweeners.map(([a, b]) => target.children.slice(a, b))

      // for each subset, make a list and add to master
      for (let i = 0; i < inbetweeners.length; i++) {
        const [a, b] = _inbetweeners[i]
        let nodes = inbetweeners[i]

        // if list would be empty, create a stub (nil node) inside it
        if (nodes.length === 0) {
          const nil = this.node._new(target.children[a].start, this.recipes.get(`nil`), 0)
          nil.length = 0

          nodes = [nil]
        }

        // enlist nodes and add to master
        const list = master._new(nodes[0].start, this.recipes.get(`list`), master.children.length)
        list.length = 0
        for (const node of nodes) {
          list.addChild(node)
          list.length += node.length
        }

        // recursive reorganize new list
        list.parser.reorganize(this.options)
      }

      const minStart = inbetweeners[0].length === 0 ? master.start : inbetweeners[0][0].start
      const maxEnd = last(inbetweeners)!.length === 0 ? master.end! : last(last(inbetweeners)!)!.end!
      master.rasterize(minStart, maxEnd)

      master.relevant = indexes.map(node => target.children[node].relevant).flat()

      target.children = [master]
    }

    return true
  }

  // #region Decide

  _decide(syntax: Recipe, reorganizationIndexes: ReorganizationIndex[]): ReorganizeDirective {
    let directive: ReorganizeDirective = `unknown`

    if (syntax.type === `separator`) directive = `list_inbetweeners`
    else {
      // ERROR: Syntax not implemented
      debugger
    }

    return directive
  }

  // #endregion
}

interface ReorganizationIndex {
  _node: string
  node: number
  syntax: string
  priority: number
}
