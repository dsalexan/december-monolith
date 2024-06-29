import type { NodePrinterOptions } from "."
import type NodePrinter from ".."

export interface NodePrinterColorOptions {
  USE_PARENT_COLOR: boolean
  // on 'text' section
  TEXT: {
    BY_SYNTAX: {
      [syntax: string]: {
        BOLD: boolean // bold all node's text
        DIM: boolean // dim all node's text
      }
    } & {
      ENCLOSURE: {
        INNER_ONLY: boolean // color only the inner text of the enclosure, not the enclosure itself (), [], {}, %%
      }
    }
  }
  // on 'syntax' section
  SYNTAX: {
    DIM: boolean
    // "Fill" is the color for the nome name
    FILL: {
      DIM: boolean
    }
    // "Edge" is the pipes around the node names
    EDGES: {
      DIM: boolean
    }
  }
}

export function calculateColors(printer: NodePrinter, options: Partial<NodePrinterOptions>) {
  const BY_SYNTAX = options.colors?.TEXT?.BY_SYNTAX ?? ({} as Partial<NodePrinterColorOptions[`TEXT`][`BY_SYNTAX`]>)

  const NODES = options.colors?.SYNTAX ?? ({} as Partial<NodePrinterColorOptions[`SYNTAX`]>)
  const DIM_NODES = NODES?.DIM ?? false

  return {
    USE_PARENT_COLOR: options.colors?.USE_PARENT_COLOR ?? false,
    // on 'text' section
    TEXT: {
      BY_SYNTAX,
    },
    // on 'nodes' section
    SYNTAX: {
      // "Fill" is the color for the nome name
      FILL: {
        DIM: DIM_NODES || NODES?.FILL?.DIM || false,
      },
      // "Edge" is the pipes around the node names
      EDGES: {
        DIM: DIM_NODES || NODES?.EDGES?.DIM || false,
      },
    },
  } as NodePrinterColorOptions
}
