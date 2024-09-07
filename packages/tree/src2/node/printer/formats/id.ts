import { Grid, paint } from "@december/logger"
import { Range } from "@december/utils"

import { BY_ALTERNATING_NUMBER_AND_TYPE, BY_TYPE, BY_TYPE_ID, BY_TYPE_NAME } from "../../../type/styles"
import { numberToLetters } from "../../../utils"
import type Token from "../../../token"
import { PartialDeep } from "type-fest"

import { BaseFormatOptions, FormatFunction, TokenFormatOptions } from "./base"
import assert from "assert"

import { Node } from "../../node/base"

export function formatID(level: number, node: Node, token: Token | undefined, { ...options }: TokenFormatOptions): Grid.Sequence.Sequence[] {
  if (level !== node.level) return [Grid.Sequence.Sequence.FILL(paint.yellow(` `), token?.interval?.toRange() ?? node.range)]

  // if (global.__DEBUG_LABEL === `,->root` && node.name === `root`) debugger
  // if (node.name === `-1.0*`) debugger

  let color = BY_TYPE(node.type)
  if (options?.alternateColors ?? true) color = BY_ALTERNATING_NUMBER_AND_TYPE(node.indexing.non_whitespace, node.type.name)
  color = paint.grey.dim

  let repr = node.id.slice(0, 4)

  if (node.type.name === `whitespace` || node.type.id === `literal` || node.type.id === `identifier` || node.type.name === `nil`) {
    repr = ` `
  }

  // if (node.name === `root`) debugger

  const _range = node.range
  const range = _range.removeDiscontinuity()

  let spacing: Grid.Sequence.SequenceSpacing[] = []
  if (!options.ignoreSpacing && !range.columnIsPoint(`first`) && ![`literal`].includes(node.type.id)) spacing = [`BEFORE`, `AFTER`]

  const sequence = Grid.Sequence.Sequence.CENTER(color(repr), range, spacing)
  sequence.__debug = { format: `id`, node }

  if (node.type.name === `list`) sequence._mergeOptions({ minimumSizeForPipe: 2 })

  return [sequence]
}

// (tree: Tree, options: TokenFormatOptions) => Grid.Sequence.Sequence[]
export default function name(root: Node, level: number, format: TokenFormatOptions, print: PartialDeep<Grid.Sequence.PrintOptions>): FormatFunction {
  return {
    fn: () => {
      // if (global.__DEBUG_LABEL === `"->ρ1.a` && level === 2) debugger
      const tokens = root.tokenize(level)

      const sequences: Grid.Sequence.Sequence[] = []

      // format tokenized nodes to text
      for (const [j, { node, token }] of tokens.entries()) {
        // if (global.__DEBUG_LABEL === `]->L5.b` && j === 5) debugger

        const _sequences = formatID(level, node, token, { ...format })
        sequences.push(..._sequences)
      }

      return sequences
    },
    printingOptions: print,
  }
}
