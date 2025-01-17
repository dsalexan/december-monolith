import assert from "assert"
import { Node } from "../tree"
import { Block, Paint, paint } from "../logger"
import { NODE_TYPE_COLOR } from "../tree/type"
import type { Environment, VariableName } from "../interpreter"
import { ObjectValue, PropertyValue, VARIABLE_NOT_FOUND } from "../interpreter"
import { groupBy, isSymbol } from "lodash"
import { Nullable } from "tsdef"
import { ResolvedVariable } from "../interpreter/environment"

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

export interface SymbolValue_Name {
  type: `name`
  key: string
  name: VariableName
}

export interface SymbolValue_Property {
  type: `property`
  key: string
  object: VariableName
  properties: VariableName[] // nested properties
}

export type SymbolValue = SymbolValue_Name | SymbolValue_Property

export class Simbol {
  public linkedNodes: Map<LinkedNode[`key`], LinkedNode>
  public value: SymbolValue

  constructor(value: SymbolValue) {
    this.linkedNodes = new Map()
    //
    this.value = value
  }

  public get key() {
    return this.value.key
  }

  public get variableName(): VariableName {
    if (this.value.type === `name`) return this.value.name
    else if (this.value.type === `property`) return this.value.object
    //
    else throw new Error(`Invalid symbol value type: ${(this.value as any).type}`)
  }

  public linkNode(tree: string, node: Node) {
    const linkedNode = new LinkedNode(tree, node)

    if (this.linkedNodes.has(linkedNode.key)) return
    this.linkedNodes.set(linkedNode.key, linkedNode)
  }

  public explain(environment?: Environment): Block[][] {
    const row: Block[][] = []

    // 1. Variable name
    if (this.value.type === `name`) row.push([paint.white.bold(this.value.name)])
    else if (this.value.type === `property`) row.push([paint.white.bold(this.value.object), ...this.value.properties.map(property => [paint.grey.dim(`->`), paint.white(property)]).flat()])
    else throw new Error(`Invalid symbol value type: ${(this.value as any).type}`)

    // 2. Presence in Environment
    row.push([paint.identity(`  `)])
    if (environment) {
      // if (this.name === `@basethdice`) debugger

      let resolvedVariable: Nullable<ResolvedVariable> = null
      if (this.value.type === `name`) resolvedVariable = environment.resolve(this.value.name)
      else if (this.value.type === `property`) resolvedVariable = environment.resolve(this.value.object)
      else throw new Error(`Invalid symbol value type: ${(this.value as any).type}`)

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

  public clone(options: { variableName?: VariableName; properties?: VariableName[] } = {}) {
    const variableName = options.variableName ?? this.variableName
    const properties = options.properties ?? this.value.type === `property` ? (this.value as any).properties : []

    let symbolValue: SymbolValue
    if (this.value.type === `property` || (this.value.type === `name` && properties.length > 0)) symbolValue = { type: `property`, key: Simbol.getKey(variableName, ...properties), object: variableName, properties }
    else if (this.value.type === `name`) symbolValue = { type: `name`, key: variableName, name: variableName }
    //
    else throw new Error(`Invalid symbol value type: ${(this.value as any).type}`)

    return new Simbol(symbolValue)
  }

  public static getKey(variableName: VariableName, ...properties: VariableName[]) {
    return [variableName, ...properties].join(`->`)
  }
}
