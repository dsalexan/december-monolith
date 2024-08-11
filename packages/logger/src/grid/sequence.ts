import { Range } from "@december/utils"

import { isArray, last, sum } from "lodash"
import type Grid from "./grid"
import Block from "../builder/block"
import paint, { Paint } from "../paint"
import { PartialDeep } from "type-fest"

export const SEQUENCE_ALIGNMENT = [`LEFT`, `RIGHT`, `CENTER`, `FILL`] as const
export type SequenceAlignment = (typeof SEQUENCE_ALIGNMENT)[number]

export const SEQUENCE_SPACING = [`BEFORE`, `AFTER`, `BETWEEN_COLUMNS`] as const
export type SequenceSpacing = (typeof SEQUENCE_SPACING)[number]

/**
 *         COL_0 COL_1 COL_2 ... COL_N-1 COL N
 * ROW_0   Sequence[]
 * ROW_1   Sequence[]
 * ...
 * ROW_M-1 Sequence[]
 * ROW_M   Sequence[]
 *
 *
 * Each ROW can have multiple LINES
 */

export class Sequence {
  content: Block[]
  alignment: SequenceAlignment
  range: Range
  spacing: SequenceSpacing[]

  options: PrintOptions = {} as any

  // debug
  __debug: any

  constructor(content: Block | Block[], alignment: SequenceAlignment, range: Range, spacing: SequenceSpacing[] = []) {
    this.content = isArray(content) ? content : [content]
    this.alignment = alignment
    this.range = range
    this.spacing = spacing ?? []

    this.options = this._mergeOptions({})
  }

  get length() {
    return sum(this.content.map(block => String(block._data).length))
  }

  addSpacing(...spacing: SequenceSpacing[]) {
    this.spacing.push(...spacing)

    return this
  }

  // #region Proxies

  static LEFT(content: Block | Block[], range: Range, spacing: SequenceSpacing[] = []) {
    return new Sequence(content, `LEFT`, range, spacing)
  }

  static RIGHT(content: Block | Block[], range: Range, spacing: SequenceSpacing[] = []) {
    return new Sequence(content, `RIGHT`, range, spacing)
  }

  static CENTER(content: Block | Block[], range: Range, spacing: SequenceSpacing[] = []) {
    return new Sequence(content, `CENTER`, range, spacing)
  }

  static FILL(content: Block | Block[], range: Range, spacing: SequenceSpacing[] = []) {
    return new Sequence(content, `FILL`, range, spacing)
  }

  // #endregion

  _mergeOptions(options: PartialDeep<PrintOptions>): PrintOptions {
    this.options = {
      showBrackets: options.showBrackets ?? this.options.showBrackets ?? false,
      padding: {
        character: options.padding?.character ?? this.options.padding?.character ?? ` `,
        color: options.padding?.color ?? this.options.padding?.color ?? undefined,
      },
      dash: {
        character: options.dash?.character ?? this.options.dash?.character ?? `-`,
        color: options.dash?.color ?? this.options.dash?.color ?? paint.grey,
      },
      spacing: {
        character: options.spacing?.character ?? this.options.spacing?.character ?? ` `,
        color: options.spacing?.color ?? this.options.spacing?.color ?? paint.red,
      },
      minimumSizeForPipe: options.minimumSizeForPipe ?? this.options.minimumSizeForPipe ?? 2,
      minimumSizeForBracket: options.minimumSizeForBracket ?? this.options.minimumSizeForBracket ?? 2,
    }

    return this.options
  }

  /** Print content within informed width */
  print(grid: Grid, _options: PartialDeep<PrintOptions> = {}): Block[] {
    const options = this._mergeOptions(_options)

    const showBrackets = options.showBrackets

    const PADDING_CHARACTER = options.padding.character
    const PADDING_COLOR = options.padding.color

    const DASH_CHARACTER = options.dash.character
    const DASH_COLOR = options.dash.color

    const MINIMUM_SIZE_FOR_BRACKET = options.minimumSizeForBracket
    const MINIMUM_SIZE_FOR_PIPE = options.minimumSizeForPipe

    const SPACING_CHARACTER = options.spacing.character
    const SPACING_COLOR = options.spacing.color

    const blocks: Block[] = []

    const ranges = this.range.split()

    let content = this.content
    const width = grid.width(...ranges)
    const extra = width - this.length

    // ERROR: Missing space is impossible (unless you forgot to balance the grid)
    if (extra < 0) debugger

    // figure out spacing from ranges
    const [A, B] = [ranges[0], last(ranges)!]

    const [before] = grid.getSpacingIndexes(A)
    const [, after] = grid.getSpacingIndexes(B)

    let startSpacing = grid.spacing[before] ?? 0
    let endSpacing = grid.spacing[after] ?? 0

    // actually, only print end spacing if range ends at the last column
    const printEndSpacing = last(grid.imaginary)! > 0 ? this.range.y === grid.columns.length : this.range.y === grid.columns.length - 1
    if (!printEndSpacing) endSpacing = 0

    // calculate paddings
    const startPadding: Padding[] = []
    const endPadding: Padding[] = []
    const colorPadding = PADDING_COLOR ?? paint.grey

    if (this.alignment === `LEFT`) endPadding.push({ content: PADDING_CHARACTER, repeat: extra, style: colorPadding })
    else if (this.alignment === `RIGHT`) startPadding.push({ content: PADDING_CHARACTER, repeat: extra, style: colorPadding })
    else if (this.alignment === `CENTER`) {
      const start = Math.ceil(extra / 2)

      startPadding.push({ content: PADDING_CHARACTER, repeat: start, style: colorPadding })
      endPadding.push({ content: PADDING_CHARACTER, repeat: extra - start, style: colorPadding })
    } else if (this.alignment === `FILL`) {
      const fillingContent: Block[] = []

      let currentLength = 0
      while (currentLength < width) {
        for (let i = 0; i < this.content.length && currentLength < width; i++) {
          const block = this.content[i]
          const blockLength = String(block._data).length

          const remaining = width - currentLength

          if (remaining >= blockLength) {
            fillingContent.push(block)
            currentLength += blockLength
          } else {
            const slice = String(block._data).slice(0, remaining)

            const clone = block._clone()
            clone._data = slice

            fillingContent.push(clone)
            currentLength += remaining
          }
        }
      }

      content = fillingContent
    } else throw new Error(`Unimplemented alignment`)

    // calculate brackets
    if (showBrackets) {
      const exceedsMinimumForBracket = startPadding[0] && startPadding[0].repeat >= MINIMUM_SIZE_FOR_BRACKET && endPadding[0] && endPadding[0].repeat >= MINIMUM_SIZE_FOR_BRACKET
      const exceedsMinimumForPipe = startPadding[0] && startPadding[0].repeat >= MINIMUM_SIZE_FOR_PIPE && endPadding[0] && endPadding[0].repeat >= MINIMUM_SIZE_FOR_PIPE

      if (exceedsMinimumForBracket) {
        // replace spaces with dashes
        startPadding[0].content = DASH_CHARACTER
        startPadding[0].style = DASH_COLOR

        if (exceedsMinimumForPipe) {
          // remove one dash to add pipe
          startPadding[0].repeat--

          // add pipe
          startPadding.unshift({ content: `|`, repeat: 1, style: DASH_COLOR })
        }
      }

      if (exceedsMinimumForBracket) {
        // replace spaces with dashes
        endPadding[0].content = DASH_CHARACTER
        endPadding[0].style = DASH_COLOR

        if (exceedsMinimumForPipe) {
          // remove one dash to add pipe
          endPadding[0].repeat--

          // add pipe
          endPadding.push({ content: `|`, repeat: 1, style: DASH_COLOR })
        }
      }
    }

    // create blocks
    if (startSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(startSpacing)))
    for (const padding of startPadding) blocks.push(padding.style(padding.content.repeat(padding.repeat)))
    blocks.push(...content)
    for (const padding of endPadding) blocks.push(padding.style(padding.content.repeat(padding.repeat)))
    if (endSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(startSpacing)))

    // if (global.__DEBUG_LABEL === `,->L2.b`) debugger

    return blocks
  }
}

interface Padding {
  content: string
  repeat: number
  style: Paint
}

export interface PrintOptions {
  showBrackets: boolean
  padding: {
    character: string
    color: Paint | undefined
  }
  dash: {
    character: string
    color: Paint
  }
  spacing: {
    character: string
    color: Paint
  }
  minimumSizeForBracket: number
  minimumSizeForPipe: number
}

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T
