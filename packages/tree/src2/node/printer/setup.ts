import { PartialDeep } from "type-fest"

import { Range } from "@december/utils"
import { Grid } from "@december/logger"

import churchill, { Block, paint, Paint } from "../../logger"

import { Node } from "../node/base"

import { TokenFormatOptions } from "./formats/base"
import { PartialObjectDeep } from "type-fest/source/partial-deep"
import { header, content, name, RowSpec } from "./formats"

import { PrintOptions } from "./options"
import { byLevel } from "../traversal"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface PrintSetup {
  logger: typeof _logger
  //
  tree: {
    expression: string
    root: Node
    nodes: Node[][]
    height: number
  }
  rows: RowSpec[]
  //
  padding: {
    prefix: number
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  sequence: PartialObjectDeep<Grid.Sequence.PrintOptions, {}> | undefined // PartialDeep<Grid.Sequence.PrintOptions>
  style: {
    alternateColors: boolean
    ignoreSpacing: boolean
  }
}

function getNodesByLevel(root: Node) {
  const nodes: Node[][] = []

  byLevel(root, node => {
    nodes[node.level] ??= []
    nodes[node.level].push(node)
  })

  return nodes
}

export function setup(root: Node, options: PrintOptions): PrintSetup {
  const nodes = getNodesByLevel(root)
  const expression = options.expression

  const style: PrintSetup[`style`] = {
    alternateColors: options?.style?.alternateColors ?? true,
    ignoreSpacing: options?.style?.ignoreSpacing ?? false,
  }

  const rows: RowSpec[] = []
  let formatIndex = 0

  // 0. Headers
  if (options.headers ?? true) {
    rows.push({
      formats: [
        header(expression, true, { index: 0, ignoreSpacing: style.ignoreSpacing }, { ...options.sequence, showBrackets: false }), //
        header(expression, false, { index: 1, ignoreSpacing: style.ignoreSpacing }, { ...options.sequence, showBrackets: false }),
      ],
      rows: [formatIndex, (formatIndex += 2)],
    })

    rows.push(`BREAKLINE`)
  }

  // TODO: Untested
  if (root.level !== 0) debugger

  // 1. Determine WHAT to print each level
  for (let level = root.level; level < root.height; level++) {
    const spec: RowSpec = { formats: [], rows: [-1, -1], prefix: [paint.grey.italic(`${level}`)] }

    if (options.content ?? true)
      spec.formats.push(
        content(
          root,
          level,
          { index: 0, ignoreSpacing: style.ignoreSpacing, alternateColors: style.alternateColors }, //
          {
            ...options.sequence,
            //
            showBrackets: false,
          },
        ),
      )

    if (options.name ?? true)
      spec.formats.push(
        name(
          root,
          level,
          { index: 1, ignoreSpacing: style.ignoreSpacing, alternateColors: style.alternateColors, underlineFn: options.style?.underlineFn },
          {
            ...options.sequence,
            //
            showBrackets: true,
          },
        ),
      )

    if (spec.formats.length > 0) {
      spec.rows[0] = formatIndex
      spec.rows[1] = formatIndex += spec.formats.length

      rows.push(spec)
    }
  }

  return {
    logger: options.logger ?? _logger,
    //
    tree: {
      expression,
      root,
      nodes,
      height: root.height,
    },
    rows,
    //
    padding: {
      prefix: 2,
    },
    sequence: options.sequence,
    style,
  }
}
