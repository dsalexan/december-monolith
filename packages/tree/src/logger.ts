import { Block, ConsoleLogger, paint } from "@december/logger"
import { max, sum } from "lodash"

export { paint } from "@december/logger"
export type { Paint, Block } from "@december/logger"

const logger = new ConsoleLogger(`xii/tree`, `silly`).builder({ separator: `` })

export function padColumns(rows: Block[][][]) {
  // type Row: Block[][]

  const paddedRows: Block[][] = []

  // 1. for each ROW
  for (const [i, row] of rows.entries()) {
    const paddedRow: Block[] = []

    // 2. for each COLUMN
    for (const [j, blocks] of row.entries()) {
      // 3. Get all columns from each row for COLUMN J
      const vertical = rows.map(row => row[j])
      const verticalLengths = vertical.map(blocks => sum(blocks.map(block => block.length))) // all lengths

      // 2. Calculate padding for column
      const size = max(verticalLengths)!
      const length = verticalLengths[j]

      const padding = size - length

      // 3. Inject padding into row
      paddedRow.push(...blocks)
      if (padding > 0) paddedRow.push(paint.identity(` `.repeat(padding)))
    }

    paddedRows.push(paddedRow)
  }

  return paddedRows
}

export default logger
