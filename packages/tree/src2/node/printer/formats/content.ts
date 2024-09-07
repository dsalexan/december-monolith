import { difference } from "lodash"

import { Grid, paint } from "@december/logger"
import { Range } from "@december/utils"

import { BY_ALTERNATING_NUMBER_AND_TYPE, BY_TYPE, BY_TYPE_ID, BY_TYPE_NAME } from "../../../type/styles"

import type Token from "../../../token"
import { PartialDeep } from "type-fest"
import { FormatFunction, TokenFormatOptions } from "./base"
import assert from "assert"

import { Node } from "../../node/base"
import { NODE_BALANCING } from "../../node/type"

export function formatContent(level: number, node: Node, token: Token | undefined, { ...options }: TokenFormatOptions): Grid.Sequence.Sequence[] {
  const sequences: Grid.Sequence.Sequence[] = []

  const higherContent = node.level < level

  // if (global.__DEBUG_LABEL === `,->root` && node.name === `C1.a`) debugger
  // if (node.name === `s3.b`) debugger

  const tokens = token ? [{ node, token }] : node.tokenize()
  const __DEBUG_TOKENS = tokens.map(token => {
    const repr = token.token ? token.token.lexeme : token.node.lexeme
    const range = token.token?.interval?.toRange() ?? token.node.range
    return `${token.node.name}, (${repr}), [${range.column(`first`, -0.5)}:${range.column(`last`, -0.5)}]`
  })

  for (const { node: leaf, token } of tokens) {
    let repr = token ? token.lexeme : leaf.lexeme

    let color = BY_TYPE(node.type)
    if (options?.alternateColors ?? true) color = BY_ALTERNATING_NUMBER_AND_TYPE(node.indexing.non_whitespace, node.type.name)
    if (node.balancing === NODE_BALANCING.UNBALANCED) color = paint.red

    if (higherContent) color = paint.grey
    else if (node.id === leaf.id && node.type.name !== `keyword_group`) color = color.bold

    if (node.type.id === `enclosure` && node.type.name !== `list` && !node.type.modules.includes(`wrapper`)) {
      if (node.id !== leaf.id && leaf.type.id !== `keyword`) color = color.dim
      else color = color.bold
    } else if (node.type.name === `keyword_group`) {
      if (node.id === leaf.id) color = color.dim
    } else if (node.type.id === `operator`) {
      if (node.id !== leaf.id) color = color.dim
    } else if (node.type.id === `separator`) {
      if (node.id !== leaf.id) color = color.dim
    } else if (node.type.name === `function`) {
      if (node.id !== leaf.id && !leaf.attributes.tags.includes(`name`)) color = color.dim
    }

    // if (repr.length === 0) repr = `⌀`

    const range = token?.interval?.toRange() ?? leaf.range
    const sequence = Grid.Sequence.Sequence.CENTER(color(repr), range, !options.ignoreSpacing && !range.columnIsPoint(`first`) ? [`BEFORE`, `AFTER`] : [])
    sequence.__debug = { format: `content`, node: leaf }

    sequences.push(sequence)
  }

  return sequences
}

export default function content(root: Node, level: number, format: TokenFormatOptions, print: PartialDeep<Grid.Sequence.PrintOptions>): FormatFunction {
  return {
    fn: () => {
      // if (level === 3) debugger

      const tokens = root.tokenize(level)

      const sequences: Grid.Sequence.Sequence[] = []

      // format tokenized nodes to text
      for (const [j, { node, token }] of tokens.entries()) {
        const _sequences = formatContent(level, node, token, { ...format })
        sequences.push(..._sequences)
      }

      return sequences
    },
    printingOptions: print,
  }
}
