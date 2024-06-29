import { cloneDeep, range } from "lodash"
import type NodePrinter from ".."
import Node from "../.."

import churchill, { paint } from "../../../logger"
import { CalculationHeader, calculateHeader } from "./header"
import { NodePrinterColorOptions, calculateColors } from "./colors"
import { PaddingColumn, calculatePadding } from "./padding"
export const _logger = churchill.child(`node`, undefined, { separator: `` })

export type PrintSection = `context` | `header` | `text` | `syntax` | `parent_nodes`

export interface NodePrinterOptions {
  logger: typeof _logger
  //
  align: boolean
  sections: PrintSection[]
  levels: number[]
  calculate: Partial<{
    levels: number[] // only calculate these levels
    upTo: number // only calculate up to this level
    from: number // only calculate from this level
  }>
  //
  lineSize: number // max line size (for capping)
  dontAccountForLevelPaddingInLineSize: boolean // subtract PADDING_LEVEL from lineSize
  //
  // onlyRelevantSource
  ignoreSpacingOutsideNode: boolean | Node // Only consider characters inside note (self or a referenced node) to calculate spacing
  //
  onlyShowNaturalNumbersInHeader: boolean
  colors: Partial<NodePrinterColorOptions>
}

export interface NodePrinterSetup {
  logger: typeof _logger
  //
  ALIGN: boolean
  SOURCE_TEXT: string
  NODES: Node[][]
  MAX_LEVEL: number
  ROOT_MAX_LEVEL: number
  //
  CHARACTERS: {
    PLACEHOLDER: string
    REMAINING_COLUMNS: string
    EMPTYSPACE: string
    WHITESPACE: string
    DASH: string
    EDGES: string[]
  }
  COLORS: NodePrinterColorOptions
  PRINT: {
    LEVELS: number[]
    //
    HEADER: boolean
    TEXT: boolean
    SYNTAX: boolean
    PARENT_NODES: boolean
    CONTEXT: boolean
    //
    RANGE: [number, number]
    ONLY_NATURAL_NUMBERS_IN_HEADER: boolean
  }
  SIZE: {
    LINE_MAX: number
    LINE_LEVEL_PADDED: number
    //
    SOURCE_TEXT: number
  }
  PADDING: {
    LEVEL: number
    COLUMN: PaddingColumn[]
  }
}

export function defaultOptions(printer: NodePrinter, options: Partial<NodePrinterOptions>) {
  const logger = options.logger ?? _logger

  const _ = calculateHeader(printer, options)

  const CHARACTERS = {
    PLACEHOLDER: `.`,
    REMAINING_COLUMNS: ``,
    EMPTYSPACE: ` `,
    //
    WHITESPACE: ` `,
    DASH: `-`,
    EDGES: [`|`, `|`],
  }

  const COLORS = calculateColors(printer, options)

  const PRINT = {
    LEVELS: _.PRINT_LEVELS,
    RANGE: _.PRINT_RANGE,
    //
    HEADER: _.PRINT_SECTIONS.includes(`header`),
    TEXT: _.PRINT_SECTIONS.includes(`text`),
    SYNTAX: _.PRINT_SECTIONS.includes(`syntax`),
    PARENT_NODES: _.PRINT_SECTIONS.includes(`parent_nodes`),
    CONTEXT: _.PRINT_SECTIONS.includes(`context`),
    //
    ONLY_NATURAL_NUMBERS_IN_HEADER: _.ONLY_NATURAL_NUMBERS_IN_HEADER,
  }

  const PADDING = {
    LEVEL: _.LEVEL_PADDING,
    COLUMN: calculatePadding(printer, options, _),
  }

  return {
    logger,
    //
    ALIGN: options.align ?? true,
    SOURCE_TEXT: _.SOURCE_TEXT,
    NODES: _.LEVELS,
    MAX_LEVEL: _.MAX_LEVEL,
    ROOT_MAX_LEVEL: _.ROOT_MAX_LEVEL,
    //
    CHARACTERS,
    COLORS,
    PRINT,
    SIZE: {
      LINE_MAX: _.LINE_SIZE,
      LINE_LEVEL_PADDED: _.LINE_SIZE - PADDING.LEVEL,
      //
      SOURCE_TEXT: _.SOURCE_TEXT.length,
    },
    PADDING,
  } as NodePrinterSetup
}
