import { Grid, paint } from "@december/logger"
import { Range } from "@december/utils"

import { BY_ALTERNATING_NUMBER_AND_TYPE, BY_TYPE, BY_TYPE_ID, BY_TYPE_NAME } from "../../../type/styles"
import { numberToLetters } from "../../../utils"
import type Token from "../../../token"
import { PartialDeep } from "type-fest"

import { BaseFormatOptions, FormatFunction, TokenFormatOptions } from "./base"
import assert from "assert"

import type Node from "../../../node"
import type Tree from "../.."

export function formatName(level: number, node: Node, token: Token | undefined, { ...options }: TokenFormatOptions): Grid.Sequence.Sequence[] {
  if (level !== node.level) return [Grid.Sequence.Sequence.FILL(paint.yellow(` `), token?.interval?.toRange() ?? node.range)]

  // if (global.__DEBUG_LABEL === `,->root` && node.name === `root`) debugger
  // if (node.name === `C1.a`) debugger

  const doHighlight = !!options.underlineFn?.(node)

  let color = BY_TYPE(node.type)
  if (options?.alternateColors ?? true) color = BY_ALTERNATING_NUMBER_AND_TYPE(node.number.non_whitespace, node.type.name)

  let doDim = !doHighlight
  let repr = node.name

  if (node.type.name === `whitespace`) {
    repr = ` `
    color = paint.gray
  } else if (node.type.id === `literal` || node.type.name === `identifier`) {
    if (node.type.name === `number` || node.type.name === `signed_number` || node.type.name === `string_collection` || node.type.name === `boolean` || node.type.name === `identifier`)
      repr = `${node.type.prefix}${numberToLetters(node.number.level)}`
    else if (node.type.name === `string`) repr = `${numberToLetters(node.number.level)}`
    else if (node.type.name === `nil`) repr = `${node.type.prefix}`
  } else if (node.type.name === `list`) {
    repr = `${node.type.prefix}${numberToLetters(node.number.level)}`
    doDim = false
  } else if (node.type.id === `separator`) doDim = false

  //   else if (node.syntax.name === `nil`) text = [`⌀`]

  if (doDim) color = color.dim
  if (doHighlight) color = color.underline

  // if (node.name === `root`) debugger

  const _range = node.range
  const range = _range.removeDiscontinuity()
  const sequence = Grid.Sequence.Sequence.CENTER(color(repr), range, !options.ignoreSpacing && !range.columnIsPoint(`first`) ? [`BEFORE`, `AFTER`] : [])
  sequence.__debug = { format: `name`, node }

  if (node.type.name === `list`) sequence._mergeOptions({ minimumSizeForPipe: 2 })

  return [sequence]
}

// (tree: Tree, options: TokenFormatOptions) => Grid.Sequence.Sequence[]
export default function name(tree: Tree, level: number, format: TokenFormatOptions, print: PartialDeep<Grid.Sequence.PrintOptions>): FormatFunction {
  return {
    fn: () => {
      // if (global.__DEBUG_LABEL === `"->ρ1.a` && level === 2) debugger
      const tokens = tree.root.tokenize(level)

      const sequences: Grid.Sequence.Sequence[] = []

      // format tokenized nodes to text
      for (const [j, { node, token }] of tokens.entries()) {
        // if (global.__DEBUG_LABEL === `]->L5.b` && j === 5) debugger

        const _sequences = formatName(level, node, token, { ...format })
        sequences.push(..._sequences)
      }

      return sequences
    },
    printingOptions: print,
  }
}
