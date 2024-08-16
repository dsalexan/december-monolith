import { Block, Grid } from "@december/logger"

import content from "./content"
import name from "./name"
import header from "./header"
import { ExpressionFormatOptions, FormatFunction, TokenFormatOptions } from "./base"

export type { FormatFunction } from "./base"

export { default as name } from "./name"
export { default as content } from "./content"

export { default as header } from "./header"

export interface FormatSpec {
  formats: FormatFunction[]
  rows: [number, number]
  prefix?: Block[]
}

export type RowSpec = FormatSpec | `BREAKLINE`

export * as Styles from "../../../type/styles"
