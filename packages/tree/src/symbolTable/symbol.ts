import assert from "assert"
import { Node } from "../tree"
import { Block, Paint, paint } from "../logger"
import { NODE_TYPE_COLOR } from "../tree/type"
import type { Environment, VariableName } from "../interpreter"
import { VARIABLE_NOT_FOUND } from "../interpreter"
import { isSymbol } from "lodash"

export class LinkedNode {
  public tree: string // "name" or designation of tree
  public node: Node

  constructor(tree: string, node: Node) {
    this.tree = tree
    this.node = node
  }

  public get key(): string {
    return `${this.tree}::${this.node.id}`
  }
}

export class Simbol {
  public name: VariableName
  public linkedNodes: Map<LinkedNode[`key`], LinkedNode>

  constructor(name: VariableName) {
    this.name = name
    this.linkedNodes = new Map()
  }

  public linkNode(tree: string, node: Node) {
    const linkedNode = new LinkedNode(tree, node)

    assert(this.linkedNodes.has(linkedNode.key) === false, `Node already linked to symbol.`)
    this.linkedNodes.set(linkedNode.key, linkedNode)
  }

  public explain(environment?: Environment): Block[][] {
    const row: Block[][] = []

    // 1. Variable name
    row.push([paint.white.bold(this.name)])

    // 2. Presence in Environment
    if (environment) {
      const resolvedVariable = environment.resolve(this.name)

      if (!resolvedVariable) row.push([paint.italic.red(`(missing in environment)`)])
      else if (!resolvedVariable.environment) row.push([paint.italic.red(`(resolved to "${resolvedVariable.variableName}", but it is missing in environment)`)])
      else {
        const envIsFallback = resolvedVariable.environment.name.endsWith(`:fallback`)
        const variableIsFallback = resolvedVariable.variableName.endsWith(`:fallback`)

        const color = envIsFallback || variableIsFallback ? paint.yellow : paint.green
        let value = resolvedVariable.environment.getValue(resolvedVariable.variableName)

        row.push([color(String(value))])
      }
    }

    // 3. Linked Nodes
    for (const { tree, node } of this.linkedNodes.values()) {
      const color = NODE_TYPE_COLOR[node.type] || paint.white

      row.push([paint.identity(`  `)])
      row.push([
        paint.dim.grey(tree), //
        paint.identity(` `),
        color.dim.bold(node.name),
        color.dim(` ${node.type.toString()}`),
      ])
    }

    return row
  }
}
