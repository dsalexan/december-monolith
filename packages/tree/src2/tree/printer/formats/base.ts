import { PartialDeep } from "type-fest"
import type Token from "../../../token"
import type Node from "../../../node"
import Tree from "../.."
import { Grid } from "@december/logger"

export interface BaseFormatOptions {
  index: number // index of format within row spec
  ignoreSpacing?: boolean
}

export interface TokenFormatOptions extends BaseFormatOptions {
  alternateColors?: boolean
  underlineFn?: (node: Node) => boolean
}

export interface ExpressionFormatOptions extends BaseFormatOptions {}

// export default function content(format: TokenFormatOptions, print: PartialDeep<Grid.Sequence.PrintOptions>) {
//   return {
//     fn: formatContent,
//     formattingOptions: format,
//     printingOptions: print,
//   }
// }

export interface FormatFunction {
  fn: () => Grid.Sequence.Sequence[]
  printingOptions: PartialDeep<Grid.Sequence.PrintOptions>
}
