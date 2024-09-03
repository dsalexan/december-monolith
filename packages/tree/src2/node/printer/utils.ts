import { PartialDeep } from "type-fest"

import { Range } from "@december/utils"
import { Grid } from "@december/logger"

import churchill, { Block, paint, Paint } from "../../logger"

import { Node } from "../node/base"

import { TokenFormatOptions } from "./formats/base"
import { sum } from "lodash"

export function center(block: Block, width: number, padding?: Block) {
  padding ??= paint.red(` `)
  const character = String(padding?._data)[0]

  const blocks: Block[] = [block]

  const length = sum([String(block._data).length])

  const extra = width - length
  const s = Math.ceil(extra / 2)
  const e = extra - s

  if (s > 0) {
    const _clone = padding._clone()
    _clone._data = character.repeat(s)
    blocks.unshift(_clone)
  }
  if (e > 0) {
    const _clone = padding._clone()
    _clone._data = character.repeat(e)
    blocks.push(_clone)
  }

  return blocks
}
