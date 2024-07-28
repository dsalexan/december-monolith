import { Grid, paint } from "@december/logger"

import type Node from "../node"
import { BY_TYPE_ID, BY_TYPE_NAME } from "./styles"
import { numberToLetters } from "../../utils"

export default function name(node: Node): Grid.Sequence.Sequence[] {
  let color = BY_TYPE_NAME[node.type.name] ?? BY_TYPE_ID[node.type.id] ?? paint.white

  color = color.dim

  let repr = node.name

  if (node.type.name === `whitespace`) {
    repr = ` `
    color = paint.gray
  } else if (node.type.id === `literal`) {
    if (node.type.name === `number`) repr = `${node.type.prefix}${numberToLetters(node.index)}`
    else if (node.type.name === `string`) repr = `${node.index}`
  } else if (node.type.name === `list`) repr = `${node.type.prefix}`

  //   else if (node.syntax.name === `nil`) text = [`⌀`]

  const sequence = Grid.Sequence.Sequence.CENTER(color(repr), node.range, [`BEFORE`, `AFTER`])
  sequence.__debug = { format: `name`, node }

  if (node.type.name === `list`) sequence._mergeOptions({ minimumSizeForBracket: 3 })

  return [sequence]
}
