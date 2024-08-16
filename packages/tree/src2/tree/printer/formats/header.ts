import { difference, last } from "lodash"
import { Grid, paint } from "@december/logger"
import { Range } from "@december/utils"

import { BY_ALTERNATING_NUMBER_AND_TYPE, BY_TYPE, BY_TYPE_ID, BY_TYPE_NAME } from "../../../type/styles"

import type Token from "../../../token"
import { PartialDeep } from "type-fest"
import type { BaseFormatOptions, ExpressionFormatOptions, FormatFunction } from "./base"
import assert from "assert"

import type Node from "../../../node"
import type Tree from "../.."

export function formatHeader(expression: string, printIndex: boolean, { ...options }: ExpressionFormatOptions): Grid.Sequence.Sequence[] {
  // if (global.__DEBUG_LABEL === `,->root` && node.name === `root`) debugger

  const sequences: Grid.Sequence.Sequence[] = []

  for (const [i, character] of [...expression].entries()) {
    let color = paint.white
    if (i % 2 === 0) color = paint.blue
    else color = paint.green

    if (!printIndex) {
      color = character === ` ` ? paint.bgGray : paint.gray
    }

    const content = printIndex ? String(last(String(i))!) : character

    const range = Range.fromInterval(i, i)
    const sequence = Grid.Sequence.Sequence.CENTER(color(content), range, [])
    sequence.__debug = { format: `header`, character, index: i }

    sequences.push(sequence)
  }

  return sequences
}

// (tree: Tree, options: TokenFormatOptions) => Grid.Sequence.Sequence[]
export default function header(tree: Tree, printIndex: boolean, format: ExpressionFormatOptions, print: PartialDeep<Grid.Sequence.PrintOptions>): FormatFunction {
  return {
    fn: () => formatHeader(tree.expression, printIndex, format),
    printingOptions: print,
  }
}
