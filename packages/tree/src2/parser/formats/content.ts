import { Grid, paint } from "@december/logger"

import type Node from "../node"
import { BY_TYPE_ID, BY_TYPE_NAME } from "./styles"

export default function content(node: Node): Grid.Sequence.Sequence[] {
  const sequences: Grid.Sequence.Sequence[] = []
  const flats = node.flatten()

  for (const { node: leaf, range } of flats) {
    const repr = leaf.lexeme

    let color = BY_TYPE_NAME[node.type.name] ?? BY_TYPE_ID[node.type.id] ?? paint.white
    if (node.id === leaf.id) color = color.bold

    const sequence = Grid.Sequence.Sequence.CENTER(color(repr), range ?? leaf.range, [`BEFORE`, `AFTER`])
    sequence.__debug = { format: `content`, node: leaf }

    sequences.push(sequence)
  }

  return sequences
}
