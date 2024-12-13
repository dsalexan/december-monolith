import { startCase } from "lodash"
import { Nullable } from "tsdef"
import assert from "assert"

import { Token } from "../../token/core"

import type { Node } from "../node"
import type { BinaryExpression, MemberExpression, PrefixExpression } from "../expression"
import { NODE_TYPE_COLOR } from "../type"

import logger, { Block, Paint, paint } from "../../logger"

export function print(node: Node) {
  printTree(node)
}

export function printTree(node: Node) {
  const prefix = node.level * 4

  // 1. Print node info
  printInlineData({
    color: { primary: NODE_TYPE_COLOR[node.type] },
    data: {
      primary: node.name, //
      secondary: node.type,
      repr: node.getDebug(),
    },
    label: node.label,
    prefix,
  })

  // 3. Print other data
  if ([`StringLiteral`, `NumericLiteral`, `ExpressionStatement`, `IfStatement`, `CallExpression`, `Identifier`].includes(node.type)) {
    // pass
  } else if ([`BinaryExpression`, `MemberExpression`, `PrefixExpression`].includes(node.type)) {
    let token: Token = null as any
    if (node.type === `BinaryExpression` || node.type === `PrefixExpression`) token = (node as BinaryExpression | PrefixExpression).operator
    else if (node.type === `MemberExpression`) token = (node as MemberExpression).property

    printInlineData({
      color: {
        primary: paint.grey.dim,
        secondary: paint.grey,
      },
      data: {
        primary: token.type === `lexical` ? token.getInterval().toString() : `(artificial)`, //
        secondary: `${startCase(token.type)}Token`,
        repr: token.content,
      },
      label: `property`,
      prefix: prefix + 4,
    })
  }
  //
  else throw new Error(`Node type not implemented: ${node.type}`)

  // 2. Print children (nodes)
  for (const child of node.children) printTree(child)
}

export interface InlineData {
  data: {
    primary?: string
    secondary?: string
    repr?: string
  }
  color?: {
    primary?: Paint
    secondary?: Paint
    repr?: Paint
  }
  label?: Nullable<string>
  prefix?: number
}

export function printInlineData({ data, color, label, prefix }: InlineData) {
  const _prefix = prefix ? ` `.repeat(prefix) : ``

  const colorPrimary = color?.primary ?? paint.white
  const colorSecondary = color?.secondary ?? colorPrimary.dim
  const colorRepr = color?.repr ?? paint.white

  logger.add(_prefix)

  if (label) logger.add(paint.dim.grey.italic(`${label}:`), ` `)

  const { primary, secondary, repr } = data
  assert(primary || secondary || repr, `At least one of primary, secondary or repr must be provided`)
  if (primary) logger.add(colorPrimary(primary), ` `)
  if (secondary) logger.add(colorSecondary(`${secondary}`), ` `)
  if (repr) logger.add(paint.dim.grey(`"`), colorRepr(repr), paint.dim.grey(`"`))

  logger.info()
}
