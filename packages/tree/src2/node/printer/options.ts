import { PartialDeep } from "type-fest"

import { Range } from "@december/utils"
import { Grid } from "@december/logger"

import churchill, { Block, paint, Paint } from "../../logger"

import { Node } from "../node/base"

import { TokenFormatOptions } from "./formats/base"
import { PartialObjectDeep } from "type-fest/source/partial-deep"
import { RowSpec } from "../../tree/printer/formats"

export const _logger = churchill.child(`node`, undefined, { separator: `` })

export interface RequiredPrintOptions {
  logger?: typeof _logger
  expression: string
}

export interface PartialPrintOptions {
  sequence: Grid.Sequence.PrintOptions
  style: {
    alternateColors: boolean
    underlineFn: TokenFormatOptions[`underlineFn`]
    ignoreSpacing: boolean
  }
  headers: boolean
  name: boolean
  content: boolean
}

export type PrintOptions = RequiredPrintOptions & PartialDeep<PartialPrintOptions>
