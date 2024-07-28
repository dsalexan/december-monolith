import { Range } from "@december/utils"

import { isArray, sum } from "lodash"
import type Grid from "./grid"
import Block from "../builder/block"
import paint, { Paint } from "../paint"

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

  // #region Range

  public get start() {
    return this.range.start
  }

  public get end() {
    return this.range.start
  }

  // #endregion

  _mergeOptions(options: Partial<PrintOptions>): PrintOptions {
    this.options = {
      showBrackets: options.showBrackets ?? this.options.showBrackets ?? false,
      padding: {
        character: options.padding?.character ?? this.options.padding?.character ?? ` `,
        color: options.padding?.color ?? this.options.padding?.color ?? paint.grey,
      },
      dash: {
        character: options.dash?.character ?? this.options.dash?.character ?? `-`,
        color: options.dash?.color ?? this.options.dash?.color ?? paint.grey,
      },
      spacing: {
        character: options.spacing?.character ?? this.options.spacing?.character ?? ` `,
        color: options.spacing?.color ?? this.options.spacing?.color ?? paint.red,
      },
      minimumSizeForBracket: options.minimumSizeForBracket ?? this.options.minimumSizeForBracket ?? 2,
    }

    return this.options
  }

  /** Print content within informed width */
  print(grid: Grid, _options: Partial<PrintOptions> = {}): Block[] {
    const options = this._mergeOptions(_options)

    const showBrackets = options.showBrackets

    const PADDING_CHARACTER = options.padding.character
    const PADDING_COLOR = options.padding.color

    const DASH_CHARACTER = options.dash.character
    const DASH_COLOR = options.dash.color
    const MINIMUM_SIZE_FOR_BRACKET = options.minimumSizeForBracket

    const SPACING_CHARACTER = options.spacing.character
    const SPACING_COLOR = options.spacing.color

    const blocks: Block[] = []

    const width = grid.width(this.range)
    const extra = width - this.length

    // ERROR: Missing space is impossible (unless you forgot to balance the grid)
    if (extra < 0) debugger

    let content = this.content

    const startPadding: Padding[] = []
    const endPadding: Padding[] = []

    let startSpacing = grid.spacing[this.range.start]
    let endSpacing = grid.spacing[this.range.end + 1]
    // actually, only print end spacing if range ends at the last column
    if (this.range.end !== grid.columns.length - 1) endSpacing = 0

    // ERROR: Untested
    if (!this.range.isRange) debugger

    // calculate paddings
    if (this.alignment === `LEFT`) endPadding.push({ content: PADDING_CHARACTER, repeat: extra, style: PADDING_COLOR })
    else if (this.alignment === `RIGHT`) startPadding.push({ content: PADDING_CHARACTER, repeat: extra, style: PADDING_COLOR })
    else if (this.alignment === `CENTER`) {
      const start = Math.ceil(extra / 2)

      startPadding.push({ content: PADDING_CHARACTER, repeat: start, style: PADDING_COLOR })
      endPadding.push({ content: PADDING_CHARACTER, repeat: extra - start, style: PADDING_COLOR })
    } else if (this.alignment === `FILL`) {
      const fillingContent: Block[] = []

      let currentLength = 0
      while (currentLength < this.range.length) {
        for (let i = 0; i < this.content.length && currentLength < this.range.length; i++) {
          const block = this.content[i]
          const blockLength = String(block._data).length

          const remaining = this.range.length - currentLength

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
      if (startPadding[0] && startPadding[0].repeat >= MINIMUM_SIZE_FOR_BRACKET) {
        // replace spaces with dashes
        startPadding[0].repeat--
        startPadding[0].content = DASH_CHARACTER
        startPadding[0].style = DASH_COLOR

        // add pipe
        startPadding.unshift({ content: `|`, repeat: 1, style: DASH_COLOR })
      }

      if (endPadding[0] && endPadding[0].repeat >= MINIMUM_SIZE_FOR_BRACKET) {
        // replace spaces with dashes
        endPadding[0].repeat--
        endPadding[0].content = DASH_CHARACTER
        endPadding[0].style = DASH_COLOR

        // add pipe
        endPadding.push({ content: `|`, repeat: 1, style: DASH_COLOR })
      }
    }

    // create blocks
    if (startSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(startSpacing)))
    for (const padding of startPadding) blocks.push(padding.style(padding.content.repeat(padding.repeat)))
    blocks.push(...content)
    for (const padding of endPadding) blocks.push(padding.style(padding.content.repeat(padding.repeat)))
    if (endSpacing > 0) blocks.push(SPACING_COLOR(SPACING_CHARACTER.repeat(startSpacing)))

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
    color: Paint
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
}
