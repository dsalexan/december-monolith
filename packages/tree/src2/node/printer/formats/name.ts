import { Grid, paint } from "@december/logger"
import { Range } from "@december/utils"

import { BY_ALTERNATING_NUMBER_AND_TYPE, BY_TYPE, BY_TYPE_ID, BY_TYPE_NAME } from "../../../type/styles"
import { numberToLetters } from "../../../utils"
import type Token from "../../../token"
import { PartialDeep } from "type-fest"

import { BaseFormatOptions, FormatFunction, TokenFormatOptions } from "./base"
import assert from "assert"

import { Node } from "../../node/base"
import { NODE_BALANCING } from "../../node/type"

export function formatName(level: number, node: Node, token: Token | undefined, { ...options }: TokenFormatOptions): Grid.Sequence.Sequence[] {
  if (level !== node.level) return [Grid.Sequence.Sequence.FILL(paint.yellow(` `), token?.interval?.toRange() ?? node.range)]

  // if (global.__DEBUG_LABEL === `,->root` && node.name === `root`) debugger
  // if (node.name === `-1.0*`) debugger

  const doHighlight = !!options.underlineFn?.(node)

  let color = BY_TYPE(node.type)
  if (options?.alternateColors ?? true) color = BY_ALTERNATING_NUMBER_AND_TYPE(node.indexing.non_whitespace, node.type.name)
  if (node.balancing === NODE_BALANCING.UNBALANCED) color = paint.red

  let doDim = !doHighlight
  let repr = node.name

  const number = node.indexing.level === -1 ? `${node.index === -1 ? `` : node.index}*` : numberToLetters(node.indexing.level)

  if (node.type.name === `whitespace`) {
    repr = ` `
    color = paint.gray
  } else if (node.type.id === `literal` || node.type.name === `identifier`) {
    if (node.type.name === `number` || node.type.name === `unit` || node.type.name === `sign` || node.type.name === `string_collection` || node.type.name === `boolean` || node.type.name === `identifier`)
      repr = `${node.type.prefix}${number}`
    else if (node.type.name === `string`) repr = `${number}`
    else if (node.type.name === `nil`) repr = `${node.type.prefix}`
  } else if (node.type.name === `list`) {
    repr = `${node.type.prefix}${number}`
    doDim = false
  } else if (node.type.id === `separator`) doDim = false

  //   else if (node.syntax.name === `nil`) text = [`⌀`]

  if (doDim) color = color.dim
  if (doHighlight) color = color.underline

  // if (node.name === `root`) debugger

  const _range = node.range
  const range = _range.removeDiscontinuity()

  let spacing: Grid.Sequence.SequenceSpacing[] = []
  if (!options.ignoreSpacing && !range.columnIsPoint(`first`) && ![`literal`].includes(node.type.id)) spacing = [`BEFORE`, `AFTER`]

  const sequence = Grid.Sequence.Sequence.CENTER(color(repr), range, spacing)
  sequence.__debug = { format: `name`, node }

  if (node.type.name === `list`) sequence._mergeOptions({ minimumSizeForPipe: 2 })

  return [sequence]
}

// (tree: Tree, options: TokenFormatOptions) => Grid.Sequence.Sequence[]
export default function name(root: Node, level: number, format: TokenFormatOptions, print: PartialDeep<Grid.Sequence.PrintOptions>): FormatFunction {
  return {
    fn: () => {
      // if (global.__DEBUG_LABEL === `"->ρ1.a` && level === 2) debugger
      const tokens = root.tokenize({ level })

      const sequences: Grid.Sequence.Sequence[] = []

      // format tokenized nodes to text
      for (const [j, word] of tokens.entries()) {
        // if (global.__DEBUG_LABEL === `]->L5.b` && j === 5) debugger
        if (word.type === `node`) {
          const { node, token } = word

          const _sequences = formatName(level, node, token, { ...format })
          sequences.push(..._sequences)
        } else throw new Error(`Unimplemented tokenized word type "${word.type}"`)
      }

      return sequences
    },
    printingOptions: print,
  }
}
