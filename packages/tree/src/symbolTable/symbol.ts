import assert from "assert"
import { Node } from "../tree"
import { Block, Paint, paint } from "../logger"
import { NODE_TYPE_COLOR } from "../tree/type"
import type { Environment, VariableName } from "../interpreter"
import { ObjectValue, PropertyValue, VARIABLE_NOT_FOUND } from "../interpreter"
import { groupBy, isSymbol } from "lodash"

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
    row.push([paint.identity(`  `)])
    if (environment) {
      // if (this.name === `@basethdice`) debugger

      const resolvedVariable = environment.resolve(this.name)

      // if (!resolvedVariable || !resolvedVariable.environment) debugger

      if (!resolvedVariable) row.push([paint.italic.red(`(missing in environment)`)])
      else if (!resolvedVariable.environment) row.push([paint.italic.red(`(resolved to "${resolvedVariable.variableName}", but it is missing in environment)`)])
      else {
        const envIsFallback = resolvedVariable.environment.name.endsWith(`:fallback`)
        const variableIsFallback = resolvedVariable.variableName.endsWith(`:fallback`)

        const color = envIsFallback || variableIsFallback ? paint.yellow : paint.green
        let value = resolvedVariable.environment.getValue(resolvedVariable.variableName)!

        let content = value.getContent()
        if (content === `[object Object]`) {
          if (`name` in value.value) content = value.value.name
          if (ObjectValue.isObjectValue(value) && value.isEmptyObject()) content = `{}`
          if (PropertyValue.isPropertyValue(value)) content = `${value.value.objectVariableName}::${value.value.propertyName}`
        }

        const blocks: Block[] = [color.dim(`<${value.type}> `), color(content)]

        if (ObjectValue.isObjectValue(value)) {
          if (value.hasNumericRepresentation()) blocks.push(paint.dim(` (${value.asNumber()})`))
        }

        row.push(blocks)
      }
    }

    // 3. Linked Nodes
    row.push([paint.identity(`  `)])

    const nodesByType = groupBy([...this.linkedNodes.values()], ({ node }) => node.type.toString())
    for (const [type, nodes] of Object.entries(nodesByType)) {
      const color = NODE_TYPE_COLOR[type] || paint.white

      row.push([
        paint.identity(` `), //
        color.dim.bold(type),
        color.dim(`[`),
      ])
      for (const { tree, node } of nodes) {
        row.push([
          paint.identity(` `),
          paint.dim.grey(tree), //
          paint.identity(` `),
          paint.grey.bold(node.name),
          paint.dim.grey(`,`), //
        ])
      }
      row.push([color.dim(` ]`)])
    }

    return row
  }
}
