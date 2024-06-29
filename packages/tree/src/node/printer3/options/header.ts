import { range } from "lodash"

import type { NodePrinterOptions, PrintSection } from "."
import type NodePrinter from ".."
import type Node from "../.."

export interface CalculationHeader {
  SOURCE_TEXT: string
  PRINT_SECTIONS: PrintSection[]
  PRINT_RANGE: [number, number]
  //
  LEVELS: Node[][]
  MAX_LEVEL: number
  PRINT_LEVELS: number[]
  //
  ROOT_LEVELS: Node[][]
  ROOT_MAX_LEVEL: number
  //
  LEVEL_PADDING: number
  LINE_SIZE: number
  //
  ONLY_NATURAL_NUMBERS_IN_HEADER: boolean
}

export function calculateHeader(printer: NodePrinter, options: Partial<NodePrinterOptions>) {
  const SOURCE_TEXT = printer.node.tree.text

  const ROOT_LEVELS = printer.node.root.getLevels()
  const LEVELS = printer.node.getLevels()

  // determine effective range to print
  let PRINT_RANGE = [0, SOURCE_TEXT.length - 1] as [number, number]
  if (options.ignoreSpacingOutsideNode) {
    const node = options.ignoreSpacingOutsideNode === true ? printer.node : options.ignoreSpacingOutsideNode
    PRINT_RANGE = [node.start, node.end!]
  }

  // pre-calculating padding level to facilitate math
  const LEVEL_PADDING = `${LEVELS.length}: `.length

  // calculate line size for capping
  let LINE_SIZE = options.lineSize ?? 350 // Infinity
  if (options.dontAccountForLevelPaddingInLineSize) LINE_SIZE = LINE_SIZE - LEVEL_PADDING

  return {
    SOURCE_TEXT: printer.node.tree.text,
    PRINT_SECTIONS: options.sections ?? [`header`, `text`, `syntax`, `context`],
    PRINT_RANGE,
    PRINT_LEVELS: options.levels ?? range(0, ROOT_LEVELS.length),
    //
    LEVELS: LEVELS,
    MAX_LEVEL: LEVELS.length,
    //
    ROOT_LEVELS: ROOT_LEVELS,
    ROOT_MAX_LEVEL: ROOT_LEVELS.length,
    //
    LEVEL_PADDING,
    LINE_SIZE,
    //
    ONLY_NATURAL_NUMBERS_IN_HEADER: options.onlyShowNaturalNumbersInHeader ?? false,
  } as CalculationHeader
}
